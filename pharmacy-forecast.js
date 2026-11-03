// HealthOS AI — pharmacy demand forecasting (read-only, rule-based).
(function () {
    "use strict";

    const byId = (id) => document.getElementById(id);
    const refreshButton = byId("pharmacyForecastRefresh");
    const rows = byId("pharmacyForecastRows");
    const message = byId("pharmacyForecastMessage");
    if (!refreshButton || !rows || !message) return;

    function localDateString(date) {
        return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    }

    function setMessage(text, isError) {
        message.textContent = text;
        message.style.color = isError ? "#b42318" : "";
    }

    function addCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = String(value ?? "—");
        row.appendChild(cell);
    }

    function normalizedName(value) {
        return String(value || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
    }

    async function loadForecast() {
        refreshButton.disabled = true;
        rows.replaceChildren();
        const loading = document.createElement("tr");
        addCell(loading, "Calculating clinic inventory and dispensing trends…");
        loading.firstChild.colSpan = 8;
        rows.appendChild(loading);

        try {
            if (typeof supabaseClient === "undefined" || !supabaseClient) throw new Error("Database connection is not ready. Sign in again.");
            if (typeof currentUser === "undefined" || !currentUser || !currentUser.id) throw new Error("Please sign in to view pharmacy forecasting.");
            if (typeof currentClinic === "undefined" || !currentClinic || !currentClinic.id) throw new Error("Select a clinic before viewing its pharmacy forecast.");

            const today = new Date();
            const todayString = localDateString(today);
            const since30 = new Date(today); since30.setDate(since30.getDate() - 30);
            const since90 = new Date(today); since90.setDate(since90.getDate() - 90);
            const since30Iso = since30.toISOString();
            const since90Iso = since90.toISOString();
            const expiryLimit = new Date(today); expiryLimit.setDate(expiryLimit.getDate() + 30);
            const expiryLimitString = localDateString(expiryLimit);

            const [stockResult, dispensingResult] = await Promise.all([
                supabaseClient.from("pharmacy_inventory")
                    .select("id, medicine_name, quantity, expiry_date, reorder_level, batch_number")
                    .eq("clinic_id", currentClinic.id)
                    .limit(10000),
                supabaseClient.from("pharmacy_dispensing_records")
                    .select("medicine_name_snapshot, quantity_dispensed, dispensed_at")
                    .eq("clinic_id", currentClinic.id)
                    .eq("status", "dispensed")
                    .gte("dispensed_at", since90Iso)
                    .order("dispensed_at", { ascending: false })
                    .limit(10000)
            ]);
            if (stockResult.error) throw stockResult.error;
            if (dispensingResult.error) throw dispensingResult.error;

            const groups = new Map();
            function getGroup(name) {
                const key = normalizedName(name);
                if (!key) return null;
                if (!groups.has(key)) groups.set(key, {
                    name: String(name).trim(), available: 0, expiring: 0,
                    totalStock: 0, reorderLevel: 0, used30: 0, used90: 0,
                    hasHistory: false
                });
                return groups.get(key);
            }

            (stockResult.data || []).forEach((batch) => {
                const group = getGroup(batch.medicine_name);
                if (!group) return;
                const quantity = Math.max(0, Number(batch.quantity) || 0);
                group.totalStock += quantity;
                group.reorderLevel = Math.max(group.reorderLevel, Number(batch.reorder_level) || 0);
                if (!batch.expiry_date || batch.expiry_date >= todayString) group.available += quantity;
                if (batch.expiry_date && batch.expiry_date >= todayString && batch.expiry_date <= expiryLimitString) group.expiring += quantity;
            });

            (dispensingResult.data || []).forEach((record) => {
                const group = getGroup(record.medicine_name_snapshot);
                if (!group) return;
                const quantity = Math.max(0, Number(record.quantity_dispensed) || 0);
                const dispensedAt = new Date(record.dispensed_at);
                if (Number.isNaN(dispensedAt.getTime())) return;
                group.hasHistory = true;
                group.used90 += quantity;
                if (dispensedAt >= since30) group.used30 += quantity;
            });

            const forecast = Array.from(groups.values()).map((group) => {
                const dailyRate = group.used30 > 0 ? group.used30 / 30 : group.used90 / 90;
                const daysCover = dailyRate > 0 ? group.available / dailyRate : null;
                let signal = "Monitor";
                if (!group.hasHistory) signal = "Insufficient history";
                else if (dailyRate > 0 && group.available <= 0) signal = "Stockout risk";
                else if (dailyRate > 0 && daysCover < 14) signal = "Urgent reorder review";
                else if (dailyRate > 0 && daysCover < 30) signal = "Reorder review";
                else if (group.expiring > 0) signal = "Expiry exposure";
                return { ...group, dailyRate, daysCover, demand30: Math.ceil(dailyRate * 30), signal };
            }).sort((a, b) => {
                const priority = (value) => value === "Stockout risk" ? 0 : value === "Urgent reorder review" ? 1 : value === "Reorder review" ? 2 : value === "Expiry exposure" ? 3 : value === "Insufficient history" ? 4 : 5;
                return priority(a.signal) - priority(b.signal) || a.name.localeCompare(b.name);
            });

            rows.replaceChildren();
            if (!forecast.length) {
                const tr = document.createElement("tr"); addCell(tr, "No pharmacy stock or dispensing records found for this clinic."); tr.firstChild.colSpan = 8; rows.appendChild(tr);
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
                    addCell(tr, item.signal);
                    rows.appendChild(tr);
                });
            }
            const urgent = forecast.filter((x) => ["Stockout risk", "Urgent reorder review"].includes(x.signal)).length;
            const noHistory = forecast.filter((x) => !x.hasHistory).length;
            byId("pharmacyForecastMedicineCount").textContent = String(forecast.length);
            byId("pharmacyForecastUrgentCount").textContent = String(urgent);
            byId("pharmacyForecastHistoryCount").textContent = String(noHistory);
            setMessage("Forecast updated " + new Date().toLocaleString() + ". Based on up to 90 days of recorded dispensing; missing history is not treated as zero demand.", false);
        } catch (error) {
            console.error("Pharmacy demand forecast error:", error);
            rows.replaceChildren();
            const tr = document.createElement("tr"); addCell(tr, error.message || "Unable to calculate the pharmacy forecast."); tr.firstChild.colSpan = 8; rows.appendChild(tr);
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