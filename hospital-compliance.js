/* HealthOS AI — clinic-scoped compliance, risk and audit register. Append-only intake. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),form=$("complianceRegisterForm"),button=$("complianceSubmitButton"),message=$("complianceMessage"),body=$("complianceRows");
 if(!form)return;
 const say=(text,error=false)=>{message.textContent=text;message.className="message"+(error?" error":" success");};
 const ref=()=> "CMP-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
 const escDate=value=>value?new Date(value+"T00:00:00").toLocaleDateString():"—";
 function render(rows){
  body.replaceChildren();
  if(!rows.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=8;td.textContent="No compliance entries have been submitted for this clinic.";return;}
  rows.forEach(r=>{const tr=body.insertRow();[r.record_reference,r.record_type.replace(/_/g," "),r.framework,r.requirement_title,r.department_name,r.severity.toUpperCase(),escDate(r.due_date),r.status.replace(/_/g," ")].forEach(v=>{const td=tr.insertCell();td.textContent=String(v??"—");});});
 }
 async function load(){
  if(typeof supabaseClient==="undefined"||typeof currentUser==="undefined"||!currentUser||typeof currentClinic==="undefined"||!currentClinic){say("Sign in to an authorised clinic workspace to load this register.",true);return;}
  const {data,error}=await supabaseClient.from("hospital_compliance_register").select("record_reference,record_type,framework,requirement_title,department_name,severity,due_date,status,created_at").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(500);
  if(error)throw error;
  render(data||[]);
  const all=data||[],today=new Date().toISOString().slice(0,10);
  $("complianceTotal").textContent=all.length;
  $("complianceObligations").textContent=all.filter(x=>x.record_type==="obligation").length;
  $("complianceFindings").textContent=all.filter(x=>["inspection_finding","audit_review"].includes(x.record_type)).length;
  $("complianceOverdue").textContent=all.filter(x=>x.due_date&&x.due_date<today).length;
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();button.disabled=true;
  try{
   if(!navigator.onLine)throw Error("Internet connection is required to submit a compliance record.");
   if(typeof supabaseClient==="undefined"||typeof currentUser==="undefined"||!currentUser||typeof currentClinic==="undefined"||!currentClinic)throw Error("Sign in to an authorised clinic workspace first.");
   const due=$("complianceDueDate").value||null;
   const payload={clinic_id:currentClinic.id,created_by:currentUser.id,record_reference:ref(),record_type:$("complianceRecordType").value,framework:$("complianceFramework").value,requirement_title:$("complianceTitle").value.trim(),department_name:$("complianceDepartment").value.trim(),responsible_officer:$("complianceOfficer").value.trim(),severity:$("complianceSeverity").value,due_date:due,review_frequency:$("complianceFrequency").value||null,description:$("complianceDescription").value.trim(),evidence_reference:$("complianceEvidence").value.trim()||null,related_reference:$("complianceRelated").value.trim()||null,status:"pending_review"};
   if(payload.requirement_title.length<4||payload.department_name.length<2||payload.responsible_officer.length<2||payload.description.length<10)throw Error("Complete all required fields with sufficient detail.");
   const {data,error}=await supabaseClient.from("hospital_compliance_register").insert(payload).select("record_reference").single();
   if(error)throw error;
   form.reset();say("Record "+data.record_reference+" submitted. It is pending authorised compliance review and is not marked compliant or closed.");
   await load();
  }catch(err){say("Submission failed: "+(err.message||"Check permissions and connection."),true);}
  finally{button.disabled=false;}
 });
 document.addEventListener("DOMContentLoaded",()=>void load().catch(e=>say(e.message,true)));
 document.querySelectorAll('.sidebar .nav-item[href="#hospitalComplianceWorkspace"]').forEach(a=>a.addEventListener("click",()=>void load().catch(e=>say(e.message,true))));
 const original=window.loadClinicDashboard;
 window.loadHospitalComplianceRegister=()=>load().catch(e=>say(e.message,true));
})();
