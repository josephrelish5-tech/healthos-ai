// HealthOS AI — pharmacy demand, expiry and stock-movement intelligence.
// Read-only rule-based planning. It never changes stock or creates purchase orders.
(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const refreshButton = byId("pharmacyForecastRefresh");
  const rows = byId("pharmacyForecastRows");
  const message = byId("pharmacyForecastMessage");
  if (!refreshButton || !rows || !message) return;

  const DAY_MS = 86400000;
  const normalizedName = (value) => String(value || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const dateString = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  const setMessage = (value, isError) => {
    message.textContent = value;
    message.style.color = isError ? "#b42318" : "";
  };
  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = String(value ?? "—");
    row.appendChild(cell);
  }
  function placeholder(text) {
    rows.replaceChildren();
    const tr = document.createElement("tr");
    addCell(tr, text);
    tr.firstChild.colSpan = 11;
    rows.appendChild(tr);
  }

  async function loadForecast() {
    refreshButton.disabled = true;
    placeholder("Calculating clinic inventory, dispensing and stock-movement trends…");
    try {
      if (typeof supabaseClient === "undefined" || !supabaseClient) throw new Error("Database connection is not ready. Sign in again.");
      if (typeof currentUser === "undefined" || !currentUser || !currentUser.id) throw new Error("Please sign in to view pharmacy forecasting.");
      if (typeof currentClinic === "undefined" || !currentClinic || !currentClinic.id) throw new Error("Select a clinic before viewing its pharmacy forecast.");

      const today = new Date();
      const todayString = dateString(today);
      const since30 = new Date(today.getTime() - 30 * DAY_MS);
      const since90 = new Date(today.getTime() - 90 * DAY_MS);
      const expiryLimit = new Date(today.getTime() + 30 * DAY_MS);
      const since90Iso = since90.toISOString();
      const expiryLimitString = dateString(expiryLimit);

      const [stockResult, dispensingResult, movementResult] = await Promise.all([
        supabaseClient.from("pharmacy_inventory")
          .select("id, medicine_name, quantity, expiry_date, reorder_level, batch_number")
          .eq("clinic_id", currentClinic.id).limit(10000),
        supabaseClient.from("pharmacy_dispensing_records")
          .select("inventory_id, medicine_name_snapshot, quantity_dispensed, dispensed_at, status")
          .eq("clinic_id", currentClinic.id)
          .eq("status", "dispensed")
          .gte("dispensed_at", since90Iso)
          .order("dispensed_at", { ascending: false }).limit(10000),
        supabaseClient.from("pharmacy_stock_movements")
          .select("inventory_id, movement_type, quantity_delta, reason, performed_by, created_at")
          .eq("clinic_id", currentClinic.id)
          .gte("created_at", since90Iso)
          .order("created_at", { ascending: false }).limit(10000)
      ]);
      for (const result of [stockResult, dispensingResult, movementResult]) {
        if (result.error) throw result.error;
      }

      const groups = new Map();
      const inventoryNames = new Map();
      function getGroup(name) {
        const key = normalizedName(name);
        if (!key) return null;
        if (!groups.has(key)) groups.set(key, {
          name: String(name).trim(), available: 0, expired: 0, expiring: 0,
          reorderLevel: 0, used30: 0, used90: 0, hasHistory: false,
          movementFlags: 0, movementCount: 0
        });
        return groups.get(key);
      }

      (stockResult.data || []).forEach((batch) => {
        const group = getGroup(batch.medicine_name);
        if (!group) return;
        inventoryNames.set(batch.id, group);
        const quantity = Math.max(0, Number(batch.quantity) || 0);
        group.reorderLevel = Math.max(group.reorderLevel, Number(batch.reorder_level) || 0);
        if (batch.expiry_date && batch.expiry_date < todayString) {
          group.expired += quantity;
        } else {
          group.available += quantity;
          if (batch.expiry_date && batch.expiry_date <= expiryLimitString) group.expiring += quantity;
        }
      });

      (dispensingResult.data || []).forEach((record) => {
        const group = inventoryNames.get(record.inventory_id) || getGroup(record.medicine_name_snapshot);
        if (!group) return;
        const quantity = Math.max(0, Number(record.quantity_dispensed) || 0);
        const dispensedAt = new Date(record.dispensed_at);
        if (Number.isNaN(dispensedAt.getTime())) return;
        group.hasHistory = true;
        group.used90 += quantity;
        if (dispensedAt >= since30) group.used30 += quantity;
      });

      let movementReviewCount = 0;
      (movementResult.data || []).forEach((movement) => {
        const group = inventoryNames.get(movement.inventory_id);
        if (!group) return;
        group.movementCount += 1;
        const type = String(movement.movement_type || "").toLowerCase();
        const reason = String(movement.reason || "").toLowerCase();
        const reviewPattern = /adjust|write.?off|loss|damage|correction|shrink|expired|reversal|return/;
        if (reviewPattern.test(type) || reviewPattern.test(reason)) {
          group.movementFlags += 1;
          movementReviewCount += 1;
        }
      });

      const forecast = Array.from(groups.values()).map((group) => {
        const dailyRate = group.used30 > 0 ? group.used30 / 30 : group.used90 / 90;
        const daysCover = dailyRate > 0 ? group.available / dailyRate : null;
        const demand30 = Math.ceil(dailyRate * 30);
        const demandGap = Math.max(0, demand30 - group.available);
        let signal = "Monitor";
        if (group.expired > 0) signal = "Expired stock — quarantine review";
        else if (!group.hasHistory) signal = "Insufficient history";
        else if (dailyRate > 0 && group.available <= 0) signal = "Stockout risk";
        else if (dailyRate > 0 && daysCover < 14) signal = "Urgent reorder review";
        else if (dailyRate > 0 && (daysCover < 30 || group.available <= group.reorderLevel)) signal = "Reorder review";
        else if (group.expiring > 0) signal = "Expiry exposure";
        else if (group.movementFlags > 0) signal = "Stock movement review";
        return { ...group, dailyRate, daysCover, demand30, demandGap, signal };
      }).sort((a, b) => {
        const priority = (value) => ({
          "Expired stock — quarantine review": 0, "Stockout risk": 1,
          "Urgent reorder review": 2, "Reorder review": 3,
          "Expiry exposure": 4, "Stock movement review": 5,
          "Insufficient history": 6, "Monitor": 7
        }[value] ?? 8);
        return priority(a.signal) - priority(b.signal) || a.name.localeCompare(b.name);
      });

      rows.replaceChildren();
      if (!forecast.length) {
        placeholder("No pharmacy stock or dispensing records found for this clinic.");
      } else {
        forecast.forEach((item) => {
          const tr = document.createElement("tr");
          addCell(tr, item.name);
          addCell(tr, item.available);
          addCell(tr, item.used30);
          addCell(tr, item.dailyRate.toFixed(2));
          addCell(tr, item.daysCover === null ? "—" : item.daysCover.toFixed(1));
          addCell(tr, item.demand30);
          addCell(tr, item.expiring);
          addCell(tr, item.expired);
          addCell(tr, item.demandGap);
          addCell(tr, item.movementFlags + " / " + item.movementCount);
          addCell(tr, item.signal);
          rows.appendChild(tr);
        });
      }

      const urgent = forecast.filter((x) => ["Expired stock — quarantine review", "Stockout risk", "Urgent reorder review"].includes(x.signal)).length;
      const noHistory = forecast.filter((x) => !x.hasHistory).length;
      const medicineCount = byId("pharmacyForecastMedicineCount");
      const urgentCount = byId("pharmacyForecastUrgentCount");
      const historyCount = byId("pharmacyForecastHistoryCount");
      const movementCount = byId("pharmacyForecastMovementCount");
      if (medicineCount) medicineCount.textContent = String(forecast.length);
      if (urgentCount) urgentCount.textContent = String(urgent);
      if (historyCount) historyCount.textContent = String(noHistory);
      if (movementCount) movementCount.textContent = String(movementReviewCount);
      setMessage(
        "Updated " + new Date().toLocaleString() +
        ". Uses up to 90 days of recorded dispensing and stock movements. " +
        "Movement flags are review prompts, not proof of theft. Results are limited to 10,000 rows per source.",
        false
      );
    } catch (error) {
      console.error("Pharmacy demand forecast error:", error);
      placeholder(error.message || "Unable to calculate the pharmacy forecast.");
      setMessage(error.message || "Unable to calculate the pharmacy forecast.", true);
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton.addEventListener("click", loadForecast);
  document.addEventListener("click", function (event) {
    const pharmacyNav = event.target.closest('[data-section="pharmacy"], [href="#pharmacy"], #pharmacyNav, [data-target="pharmacy"]');
    if (pharmacyNav) window.setTimeout(loadForecast, 150);
  });
  const pharmacySection = byId("pharmacy");
  if (pharmacySection && !pharmacySection.hidden && pharmacySection.offsetParent !== null) window.setTimeout(loadForecast, 300);
})();