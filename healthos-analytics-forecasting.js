/* HealthOS AI Analytics and Forecasting: read-only aggregate indicators. */
(function () {
  "use strict";
  function el(id) { return document.getElementById(id); }
  function set(id, value) { var node=el(id); if(node) node.textContent=String(value); }
  function naira(value) { return "NGN " + Number(value||0).toLocaleString("en-NG",{maximumFractionDigits:2}); }
  async function refresh() {
    var message=el("hosAnalyticsMessage");
    if(!message) return;
    if(typeof supabaseClient==="undefined" || !supabaseClient || typeof currentClinic==="undefined" || !currentClinic || !currentClinic.id) {
      message.textContent="Sign in to an active clinic to view analytics."; return;
    }
    message.textContent="Loading aggregate clinic indicators...";
    try {
      var clinicId=currentClinic.id;
      async function getRows(table) {
        var result=await supabaseClient.from(table).select("*").eq("clinic_id",clinicId).limit(1000);
        if(result.error) throw new Error(table+": "+result.error.message);
        return result.data || [];
      }
      var result=await Promise.all([
        getRows("billing_transactions"),getRows("appointments"),getRows("service_events"),
        getRows("pharmacy_inventory"),getRows("staff_attendance_sessions"),getRows("pharmacy_purchase_orders")
      ]);
      var transactions=result[0], appointments=result[1], services=result[2], inventory=result[3], attendance=result[4], orders=result[5];
      var now=new Date(), cutoff=new Date(now.getTime()-30*86400000);
      function dateOf(row) { return row.created_at || row.transaction_date || row.recorded_at || row.date || row.ordered_at || null; }
      function recent(row) { var d=dateOf(row); return d && new Date(d)>=cutoff && new Date(d)<=now; }
      function amount(row) { return Number(row.amount || row.total_amount || row.paid_amount || row.net_amount || 0) || 0; }
      var paid=transactions.filter(function(r){return ["paid","completed","success","successful","settled"].indexOf(String(r.status||"").toLowerCase())>=0 && recent(r);});
      var pending=transactions.filter(function(r){return ["pending","unpaid","outstanding","part_paid","partially_paid"].indexOf(String(r.status||"").toLowerCase())>=0;});
      var low=inventory.filter(function(r){return Number(r.quantity||r.quantity_available||0)<=Number(r.reorder_level||r.minimum_stock||0);});
      var expiry=inventory.filter(function(r){var d=r.expiry_date?new Date(r.expiry_date):null;return d && d>=now && d<=new Date(now.getTime()+30*86400000);});
      var activeAppointments=appointments.filter(function(r){return ["cancelled","canceled","rejected"].indexOf(String(r.status||"").toLowerCase())<0;});
      set("hosAnalyticsRevenue",naira(paid.reduce(function(s,r){return s+amount(r);},0)));
      set("hosAnalyticsOutstanding",naira(pending.reduce(function(s,r){return s+amount(r);},0)));
      set("hosAnalyticsAppointments",activeAppointments.length);
      set("hosAnalyticsServices",services.filter(recent).length);
      set("hosAnalyticsLowStock",low.length);
      set("hosAnalyticsExpiry",expiry.length);
      set("hosAnalyticsAttendance",attendance.length);
      set("hosAnalyticsOrders",orders.length);
      set("hosAnalyticsRevenueTrend","30-day recorded paid transactions");
      var list=el("hosAnalyticsInsights");
      if(list) {
        list.textContent="";
        var notes=[];
        if(low.length) notes.push(low.length+" inventory items are at or below recorded reorder levels.");
        if(expiry.length) notes.push(expiry.length+" inventory items have expiry dates within 30 days; verify batch details.");
        if(pending.length) notes.push(pending.length+" transactions are marked pending or outstanding; reconcile with source evidence.");
        if(!notes.length) notes.push("No threshold exceptions were detected in the records returned. This is not proof that records are complete.");
        notes.forEach(function(note){var li=document.createElement("li");li.textContent=note;list.appendChild(li);});
      }
      message.textContent="Updated "+now.toLocaleString()+" · Read-only aggregate data · Up to 1,000 records per source.";
    } catch(error) { message.textContent="Analytics could not load: "+error.message+". No records were changed."; }
  }
  document.addEventListener("DOMContentLoaded",function(){
    var button=el("hosAnalyticsRefresh");
    if(button) button.addEventListener("click",refresh);
    window.setTimeout(refresh,1500);
  });
  window.healthOSAnalyticsRefresh=refresh;
}());