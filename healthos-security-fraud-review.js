(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??"—").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 async function load(){
  const status=$("healthOSSecurityMessage"),rows=$("healthOSSecurityRows");
  if(!status||!rows)return;
  const client=window.supabaseClient||window.supabase;
  const clinic=window.currentClinic;
  if(!client||!clinic?.id){status.textContent="Sign in to an authorised hospital workspace.";status.className="message error";return;}
  status.textContent="Reviewing clinic-scoped operational control signals…";rows.replaceChildren();
  try{
   const [adjustments,movements,findings,services]=await Promise.all([
    client.from("pharmacy_stock_adjustment_requests").select("id,quantity_before,quantity_after,quantity_delta,reason_code,status,requested_by,reviewed_by,created_at").eq("clinic_id",clinic.id).order("created_at",{ascending:false}).limit(300),
    client.from("pharmacy_stock_movements").select("id,movement_type,quantity_delta,reason,performed_by,created_at").eq("clinic_id",clinic.id).lt("quantity_delta",0).order("created_at",{ascending:false}).limit(300),
    client.from("revenue_audit_findings").select("id,finding_type,description,expected_amount,observed_amount,status,detected_at").eq("clinic_id",clinic.id).is("resolved_at",null).order("detected_at",{ascending:false}).limit(300),
    client.from("service_events").select("id,service_name_snapshot,unit_price,quantity,event_status,performed_at,billing_transaction_id,recorded_by").eq("clinic_id",clinic.id).in("event_status",["performed","completed"]).is("billing_transaction_id",null).order("performed_at",{ascending:false}).limit(300)
   ]);
   for(const result of [adjustments,movements,findings,services])if(result.error)throw result.error;
   const flags=[];
   (adjustments.data||[]).forEach(r=>{if(r.requested_by&&r.reviewed_by&&r.requested_by===r.reviewed_by)flags.push(["Segregation of duties","Stock adjustment was requested and reviewed by the same user.",r.created_at]);});
   (movements.data||[]).forEach(r=>{if(Number(r.quantity_delta)<0)flags.push(["Stock reduction review",(r.movement_type||"Stock movement")+" · "+(r.reason||"No reason recorded")+" · quantity "+r.quantity_delta,r.created_at]);});
   (findings.data||[]).forEach(r=>flags.push(["Open revenue audit finding",(r.finding_type||"Finding")+" · "+(r.description||"Review required"),r.detected_at]));
   (services.data||[]).forEach(r=>flags.push(["Performed service without linked billing",(r.service_name_snapshot||"Service")+" · "+(Number(r.unit_price||0)*Number(r.quantity||1)).toLocaleString()+" estimated value",r.performed_at]));
   flags.sort((a,b)=>new Date(b[2]||0)-new Date(a[2]||0));
   $("healthOSSecurityCount").textContent=flags.length;
   $("healthOSSecurityAdjustments").textContent=(adjustments.data||[]).length;
   $("healthOSSecurityMovements").textContent=(movements.data||[]).length;
   $("healthOSSecurityUnbilled").textContent=(services.data||[]).length;
   if(!flags.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=3;td.textContent="No review signals found in the retrieved records.";tr.appendChild(td);rows.appendChild(tr);}
   else flags.slice(0,150).forEach(flag=>{const tr=document.createElement("tr");flag.forEach((value,index)=>{const td=document.createElement("td");td.textContent=index===2&&value?new Date(value).toLocaleString():value;tr.appendChild(td);});rows.appendChild(tr);});
   status.textContent="Read-only review complete. "+flags.length+" signal(s) require authorised human review. Signals are not proof of misconduct; no records, stock or payments were changed.";
   status.className="message "+(flags.length?"":"success");
  }catch(error){status.textContent="Security review could not complete: "+(error.message||"Check access and table permissions.");status.className="message error";}
 }
 window.loadHealthOSSecurityReview=load;
 document.addEventListener("click",event=>{if(event.target?.id==="healthOSSecurityRefresh")load();});
})();