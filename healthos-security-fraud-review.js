(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 async function load(){
  const status=$("healthOSSecurityMessage"),rows=$("healthOSSecurityRows");
  if(!status||!rows)return;
  const client=typeof supabaseClient!=="undefined"?supabaseClient:null;
  const clinic=typeof currentClinic!=="undefined"?currentClinic:null;
  if(!client||!clinic?.id){status.textContent="Sign in to an authorised hospital workspace.";status.className="message error";return;}
  status.textContent="Reviewing clinic-scoped financial, stock and accountability signals…";rows.replaceChildren();
  try{
   const [adjustments,movements,findings,services,intents,audit]=await Promise.all([
    client.from("pharmacy_stock_adjustment_requests").select("id,quantity_before,quantity_after,quantity_delta,reason_code,status,requested_by,reviewed_by,created_at").eq("clinic_id",clinic.id).order("created_at",{ascending:false}).limit(300),
    client.from("pharmacy_stock_movements").select("id,movement_type,quantity_delta,reason,reference,performed_by,created_at").eq("clinic_id",clinic.id).lt("quantity_delta",0).order("created_at",{ascending:false}).limit(300),
    client.from("revenue_audit_findings").select("id,finding_type,description,expected_amount,observed_amount,status,detected_at").eq("clinic_id",clinic.id).is("resolved_at",null).order("detected_at",{ascending:false}).limit(300),
    client.from("service_events").select("id,service_name_snapshot,unit_price,quantity,event_status,performed_at,billing_transaction_id,recorded_by").eq("clinic_id",clinic.id).in("event_status",["performed","completed"]).is("billing_transaction_id",null).order("performed_at",{ascending:false}).limit(300),
    client.from("healthos_international_payment_intents").select("id,invoice_reference,amount,currency,provider_key,provider_reference,status,provider_amount,provider_currency,created_by,created_at,updated_at").eq("clinic_id",clinic.id).order("created_at",{ascending:false}).limit(300),
    client.from("healthos_security_audit_events").select("id,actor_user_id,table_name,record_id,operation,occurred_at,previous_hash,event_hash").eq("clinic_id",clinic.id).order("id",{ascending:false}).limit(300)
   ]);
   for(const r of [adjustments,movements,findings,services,intents,audit])if(r.error)throw r.error;
   const flags=[];
   (adjustments.data||[]).forEach(r=>{
    if(r.requested_by&&r.reviewed_by&&r.requested_by===r.reviewed_by)flags.push(["Stock adjustment: same requester/reviewer","Request "+r.id+" · segregation-of-duties exception",r.created_at]);
    if(["approved","completed","executed"].includes(String(r.status||"").toLowerCase())&&!r.reviewed_by)flags.push(["Stock adjustment: missing reviewer","Request "+r.id+" marked "+r.status+" without reviewer identity",r.created_at]);
   });
   (movements.data||[]).forEach(r=>flags.push(["Stock reduction for review",(r.movement_type||"Stock movement")+" · "+(r.reason||"No reason recorded")+" · quantity "+r.quantity_delta+" · reference "+(r.reference||"none"),r.created_at]));
   (findings.data||[]).forEach(r=>flags.push(["Open revenue audit finding",(r.finding_type||"Finding")+" · "+(r.description||"Review required"),r.detected_at]));
   (services.data||[]).forEach(r=>flags.push(["Performed service without linked billing",(r.service_name_snapshot||"Service")+" · "+(Number(r.unit_price||0)*Number(r.quantity||1)).toLocaleString()+" estimated value",r.performed_at]));
   const intentIds=(intents.data||[]).map(x=>x.id);
   if(intentIds.length){
    const ev=await client.from("healthos_payment_provider_events").select("id,payment_intent_id,event_type,signature_verified,received_at,processed_at,provider_event_id").in("payment_intent_id",intentIds).order("received_at",{ascending:false}).limit(500);
    if(ev.error)throw ev.error;
    const byId=new Map((intents.data||[]).map(x=>[x.id,x]));
    (ev.data||[]).forEach(e=>{
     const i=byId.get(e.payment_intent_id); if(!i)return;
     const typ=String(e.event_type||"").toLowerCase();
     if(/refund|reversal|chargeback|dispute/.test(typ))flags.push(["Refund/reversal event for human review",typ+" · invoice "+(i.invoice_reference||"—")+" · intent "+i.id,e.received_at]);
     if(e.signature_verified===false)flags.push(["Unverified payment-provider event","Signature verification failed · intent "+i.id,e.received_at]);
    });
   }
   (intents.data||[]).forEach(i=>{
    if(i.provider_amount!==null&&i.provider_amount!==undefined&&Math.abs(Number(i.provider_amount)-Number(i.amount))>0.01)flags.push(["Payment amount mismatch","Intent "+i.id+" · expected "+i.amount+" "+i.currency+" · provider "+i.provider_amount+" "+(i.provider_currency||""),i.updated_at||i.created_at]);
   });
   // Detect duplicate bank references without treating them as proof of duplicate payment.
   const bank=await client.from("bank_statement_transactions").select("id,bank_reference,external_transaction_id,amount,booked_at").eq("clinic_id",clinic.id).not("bank_reference","is",null).order("booked_at",{ascending:false}).limit(500);
   if(bank.error)throw bank.error;
   const seen=new Set();
   (bank.data||[]).forEach(b=>{const key=String(b.bank_reference||"").trim().toLowerCase()+"|"+String(b.amount);if(b.bank_reference&&seen.has(key))flags.push(["Repeated bank reference","Reference "+b.bank_reference+" · amount "+b.amount+" · verify against bank statement",b.booked_at]);seen.add(key);});
   // Verify the most recent chain link is present; this is a continuity indicator, not a full independent cryptographic audit.
   if((audit.data||[]).some(a=>!a.event_hash))flags.push(["Audit-chain integrity exception","One or more audit entries have no event hash",new Date().toISOString()]);
   flags.sort((a,b)=>new Date(b[2]||0)-new Date(a[2]||0));
   $("healthOSSecurityCount").textContent=flags.length;
   $("healthOSSecurityAdjustments").textContent=(adjustments.data||[]).length;
   $("healthOSSecurityMovements").textContent=(movements.data||[]).length;
   $("healthOSSecurityUnbilled").textContent=(services.data||[]).length;
   if(!flags.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=3;td.textContent="No review signals found in the retrieved records.";tr.appendChild(td);rows.appendChild(tr);}
   else flags.slice(0,150).forEach(flag=>{const tr=document.createElement("tr");flag.forEach((v,n)=>{const td=document.createElement("td");td.textContent=n===2&&v?new Date(v).toLocaleString():String(v??"—");tr.appendChild(td);});rows.appendChild(tr);});
   status.textContent="Read-only review complete. "+flags.length+" signal(s) require authorised human review. These are indicators, not proof of misconduct. No payment, refund, stock or clinical record was changed. Refund coverage depends on provider events being recorded.";
   status.className="message "+(flags.length?"":"success");
  }catch(error){status.textContent="Security review could not complete: "+(error.message||"Check table access and permissions.");status.className="message error";}
 }
 window.loadHealthOSSecurityReview=load;
 document.addEventListener("click",e=>{if(e.target?.id==="healthOSSecurityRefresh")load();});
})();