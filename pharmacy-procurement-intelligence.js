// HealthOS AI — procurement and spending intelligence (read-only, rule-based).
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const refresh = $("procurementIntelRefresh");
  const body = $("procurementIntelRows");
  const message = $("procurementIntelMessage");
  if (!refresh || !body || !message) return;

  function cell(row, value) {
    const td = document.createElement("td");
    td.textContent = String(value == null || value === "" ? "—" : value);
    row.appendChild(td);
  }
  function money(value) {
    return "₦" + (Number(value) || 0).toLocaleString("en-NG", {maximumFractionDigits: 2});
  }
  function rowNote(rows, text) {
    const tr = document.createElement("tr"); cell(tr, text);
    tr.firstChild.colSpan = 5; rows.appendChild(tr);
  }
  async function load() {
    refresh.disabled = true; body.replaceChildren();
    rowNote(body, "Reviewing procurement records…");
    try {
      if (!window.supabaseClient || !window.currentUser?.id || !window.currentClinic?.id)
        throw new Error("Sign in and select a clinic to view procurement intelligence.");
      const clinic = currentClinic.id;
      const [orders, items, payments, stock] = await Promise.all([
        supabaseClient.from("pharmacy_purchase_orders")
          .select("id,po_number,status,total_amount,ordered_at,supplier_id,created_by,approved_by")
          .eq("clinic_id", clinic).order("ordered_at", {ascending:false}).limit(500),
        supabaseClient.from("pharmacy_purchase_order_items")
          .select("purchase_order_id,medicine_name,quantity_ordered,quantity_received,unit_cost,line_total")
          .eq("clinic_id", clinic).limit(3000),
        supabaseClient.from("pharmacy_supplier_payments")
          .select("purchase_order_id,amount,status,payment_reference,recorded_by,reviewed_by")
          .eq("clinic_id", clinic).limit(2000),
        supabaseClient.from("pharmacy_inventory")
          .select("medicine_name,quantity,reorder_level,expiry_date,purchase_cost,supplier_name")
          .eq("clinic_id", clinic).limit(5000)
      ]);
      for (const result of [orders,items,payments,stock]) if (result.error) throw result.error;

      const orderRows = orders.data || [], itemRows = items.data || [], paymentRows = payments.data || [], stockRows = stock.data || [];
      const issues = [];
      const itemByOrder = new Map();
      itemRows.forEach(x => {
        if (!itemByOrder.has(x.purchase_order_id)) itemByOrder.set(x.purchase_order_id, []);
        itemByOrder.get(x.purchase_order_id).push(x);
      });
      const paymentByOrder = new Map();
      paymentRows.forEach(x => paymentByOrder.set(x.purchase_order_id, (paymentByOrder.get(x.purchase_order_id)||0)+Number(x.amount||0)));

      orderRows.forEach(order => {
        const lines = itemByOrder.get(order.id) || [];
        const incomplete = lines.filter(x => Number(x.quantity_received||0) < Number(x.quantity_ordered||0));
        if (["submitted","approved","partially_received"].includes(order.status) && incomplete.length)
          issues.push({priority:"Receipt follow-up", ref:order.po_number, detail:incomplete.length+" line(s) not fully received", amount:money(order.total_amount), action:"Match delivery note and goods receipt"});
        if (order.status === "draft" && paymentByOrder.has(order.id))
          issues.push({priority:"Payment against draft",ref:order.po_number,detail:"Payment recorded while order remains draft",amount:money(paymentByOrder.get(order.id)),action:"Finance review required"});
        if (order.approved_by && order.approved_by === order.created_by)
          issues.push({priority:"Separation-of-duties flag",ref:order.po_number,detail:"Creator and approver are the same account",amount:money(order.total_amount),action:"Independently verify approval policy"});
      });
      paymentRows.filter(p=>p.status==="pending").forEach(p=>{
        issues.push({priority:"Pending supplier payment",ref:p.payment_reference,detail:"Payment awaits authorised review",amount:money(p.amount),action:"Verify invoice, receipt and bank evidence"});
      });

      const stockGroups = new Map();
      stockRows.forEach(x=>{
        const key=String(x.medicine_name||"").trim().toLowerCase();
        if(!key)return;
        const g=stockGroups.get(key)||{name:x.medicine_name,qty:0,reorder:0,expiry:0};
        g.qty+=Number(x.quantity||0); g.reorder=Math.max(g.reorder,Number(x.reorder_level||0));
        if(x.expiry_date && x.expiry_date >= new Date().toISOString().slice(0,10) &&
          x.expiry_date <= new Date(Date.now()+30*86400000).toISOString().slice(0,10)) g.expiry+=Number(x.quantity||0);
        stockGroups.set(key,g);
      });
      stockGroups.forEach(g=>{
        if(g.qty>g.reorder && g.expiry>0)
          issues.push({priority:"Expiry exposure",ref:g.name,detail:g.expiry+" units expire within 30 days; total stock "+g.qty,amount:"—",action:"Review FEFO dispensing and pause unnecessary replenishment"});
      });
      issues.sort((a,b)=>a.priority.localeCompare(b.priority));
      body.replaceChildren();
      if(!issues.length) rowNote(body,"No rule-based procurement exceptions identified in the records retrieved. This is not proof that all transactions are correct.");
      else issues.forEach(x=>{const tr=document.createElement("tr");cell(tr,x.priority);cell(tr,x.ref);cell(tr,x.detail);cell(tr,x.amount);cell(tr,x.action);body.appendChild(tr);});
      $("procurementOrderCount").textContent=String(orderRows.length);
      $("procurementPendingPaymentCount").textContent=String(paymentRows.filter(p=>p.status==="pending").length);
      $("procurementIssueCount").textContent=String(issues.length);
      $("procurementSpendTotal").textContent=money(orderRows.reduce((sum,o)=>sum+Number(o.total_amount||0),0));
      message.textContent="Updated "+new Date().toLocaleString()+". Read-only rules over clinic-scoped records; confirm findings against source documents.";
    } catch (e) {
      console.error("Procurement intelligence:",e);
      body.replaceChildren(); rowNote(body,e.message||"Unable to load procurement intelligence.");
      message.textContent=e.message||"Unable to load procurement intelligence.";
    } finally { refresh.disabled=false; }
  }
  refresh.addEventListener("click",load);
  document.addEventListener("click",e=>{
    if(e.target.closest('[data-section="pharmacy"], [href="#pharmacy"], #pharmacyNav, [data-target="pharmacy"]'))
      setTimeout(load,250);
  });
  const panel=$("pharmacyProcurementIntelligence");
  if(panel && !panel.hidden && panel.offsetParent!==null) setTimeout(load,300);
})();
