/* HealthOS AI — Clinic Analytics & Forecasting
 * Read-only operational indicators. No records are inserted, updated, or deleted.
 * Current release is rule-based aggregation, not a trained predictive model.
 */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }
  function set(id, value) {
    var node = el(id);
    if (node) node.textContent = String(value);
  }
  function currencyTotals(rows, valueOf) {
    var totals = {};
    rows.forEach(function (row) {
      var currency = row.currency || "NGN";
      totals[currency] = (totals[currency] || 0) + Number(valueOf(row) || 0);
    });
    var entries = Object.keys(totals);
    if (!entries.length) return "NGN 0.00";
    return entries.sort().map(function (currency) {
      return currency + " " + totals[currency].toLocaleString("en-NG", {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });
    }).join(" | ");
  }
  function dateValue(value) {
    if (!value) return null;
    var date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  function isWithin(date, start, end) {
    return !!date && date >= start && date <= end;
  }

  async function refresh() {
    var message = el("hosAnalyticsMessage");
    if (!message) return;

    if (typeof supabaseClient === "undefined" || !supabaseClient ||
        typeof currentClinic === "undefined" || !currentClinic || !currentClinic.id) {
      message.textContent = "Sign in to an active clinic to view analytics.";
      return;
    }

    message.textContent = "Loading clinic analytics...";
    try {
      var clinicId = currentClinic.id;
      async function rows(table, columns) {
        var response = await supabaseClient.from(table)
          .select(columns).eq("clinic_id", clinicId).limit(1000);
        if (response.error) throw new Error(table + ": " + response.error.message);
        return response.data || [];
      }

      var results = await Promise.all([
        rows("billing_transactions",
          "invoice_amount,amount_paid,currency,payment_status,transaction_date,created_at"),
        rows("appointments", "scheduled_at,status"),
        rows("service_events", "event_status,performed_at,unit_price,quantity"),
        rows("pharmacy_inventory", "quantity,reorder_level,expiry_date"),
        rows("staff_attendance_sessions", "clocked_in_at,clocked_out_at"),
        rows("pharmacy_purchase_orders", "status,ordered_at,total_amount,currency")
      ]);

      var transactions = results[0];
      var appointments = results[1];
      var services = results[2];
      var inventory = results[3];
      var attendance = results[4];
      var orders = results[5];

      var now = new Date();
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var last30 = new Date(now.getTime() - 30 * 86400000);
      var next30 = new Date(now.getTime() + 30 * 86400000);

      var receipts = transactions.filter(function (row) {
        var status = String(row.payment_status || "").toLowerCase();
        var paidAmount = Number(row.amount_paid || 0);
        var date = dateValue(row.transaction_date || row.created_at);
        return paidAmount > 0 &&
          ["reversed", "refunded", "void", "cancelled", "canceled"].indexOf(status) < 0 &&
          isWithin(date, last30, now);
      });
      var balances = transactions.filter(function (row) {
        return Number(row.invoice_amount || 0) > Number(row.amount_paid || 0);
      });
      var activeAppointments = appointments.filter(function (row) {
        return ["cancelled", "canceled", "rejected"].indexOf(
          String(row.status || "").toLowerCase()) < 0;
      });
      var recentServices = services.filter(function (row) {
        var status = String(row.event_status || "").toLowerCase();
        return isWithin(dateValue(row.performed_at), last30, now) &&
          ["performed", "completed", "verified"].indexOf(status) >= 0;
      });
      var lowStock = inventory.filter(function (row) {
        return Number(row.quantity || 0) <= Number(row.reorder_level || 0);
      });
      var nearExpiry = inventory.filter(function (row) {
        return isWithin(dateValue(row.expiry_date), now, next30);
      });
      var attendanceToday = attendance.filter(function (row) {
        return isWithin(dateValue(row.clocked_in_at), todayStart, now) && !row.clocked_out_at;
      });
      var recentOrders = orders.filter(function (row) {
        return isWithin(dateValue(row.ordered_at), last30, now);
      });

      set("hosAnalyticsRevenue", currencyTotals(receipts, function (row) {
        return row.amount_paid;
      }));
      set("hosAnalyticsOutstanding", currencyTotals(balances, function (row) {
        return Math.max(0, Number(row.invoice_amount || 0) - Number(row.amount_paid || 0));
      }));
      set("hosAnalyticsAppointments", activeAppointments.length);
      set("hosAnalyticsServices", recentServices.length);
      set("hosAnalyticsLowStock", lowStock.length);
      set("hosAnalyticsExpiry", nearExpiry.length);
      set("hosAnalyticsAttendance", attendanceToday.length);
      set("hosAnalyticsOrders", recentOrders.length);
      set("hosAnalyticsRevenueTrend", "Receipts recorded in the last 30 days");

      var list = el("hosAnalyticsInsights");
      if (list) {
        list.replaceChildren();
        var notes = [];
        if (lowStock.length) notes.push(lowStock.length +
          " inventory items are at or below their recorded reorder level.");
        if (nearExpiry.length) notes.push(nearExpiry.length +
          " inventory items have expiry dates within the next 30 days; verify batch details.");
        if (balances.length) notes.push(balances.length +
          " billing transactions have an outstanding balance; reconcile against payment evidence.");
        if (!notes.length) notes.push(
          "No threshold exceptions were detected in the records returned. This does not prove that records are complete.");
        notes.forEach(function (note) {
          var item = document.createElement("li");
          item.textContent = note;
          list.appendChild(item);
        });
      }

      message.textContent = "Updated " + now.toLocaleString() +
        " · Read-only indicators · Maximum 1,000 records per source.";
    } catch (error) {
      message.textContent = "Analytics could not load: " + error.message +
        ". No records were changed.";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var button = el("hosAnalyticsRefresh");
    if (button) button.addEventListener("click", refresh);
    window.setTimeout(refresh, 1500);
  });
  window.healthOSAnalyticsRefresh = refresh;
}());
