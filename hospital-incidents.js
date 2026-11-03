/* HealthOS AI — hospital incident intake. Every report requires human triage. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const form=$("hospitalIncidentForm"),message=$("incidentReportMessage"),rows=$("incidentReportRows"),button=$("incidentSubmitButton");
 if(!form)return;
 const say=(text,error=false)=>{message.textContent=text;message.className="message"+(error?" error":" success");};
 function showRow(report){rows.replaceChildren();const tr=rows.insertRow();[report.incident_reference,report.category.replace(/_/g," "),report.severity.toUpperCase(),report.department_name,new Date(report.reported_at).toLocaleString(),report.status.replace(/_/g," ")].forEach(v=>{const td=tr.insertCell();td.textContent=String(v);});}
 form.addEventListener("submit",async e=>{
  e.preventDefault();button.disabled=true;
  try{
   if(!navigator.onLine)throw Error("Incident reporting requires an internet connection. Notify the responsible hospital lead immediately and use the hospital's approved downtime incident procedure.");
   if(!supabaseClient||!currentUser||!currentClinic)throw Error("Sign in to your authorised clinic workspace first.");
   const occurred=new Date($("incidentOccurredAt").value);
   if(Number.isNaN(occurred.getTime())||occurred.getTime()>Date.now()+5*60*1000)throw Error("Enter a valid incident date and time, not a future time.");
   const ref="INC-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
   const severity=$("incidentSeverity").value;
   const payload={clinic_id:currentClinic.id,reporter_id:currentUser.id,incident_reference:ref,category:$("incidentCategory").value,severity,department_name:$("incidentDepartment").value.trim(),incident_title:$("incidentTitle").value.trim(),incident_summary:$("incidentSummary").value.trim(),immediate_action:$("incidentImmediateAction").value.trim()||null,occurred_at:occurred.toISOString(),escalation_required:$("incidentEscalationRequired").checked||severity==="critical"||severity==="high",status:"pending_triage"};
   if(payload.department_name.length<2||payload.incident_title.length<4||payload.incident_summary.length<10)throw Error("Complete the department, title and factual incident summary.");
   const {data,error}=await supabaseClient.from("hospital_incident_reports").insert(payload).select("incident_reference,category,severity,department_name,reported_at,status").single();
   if(error)throw error;
   showRow(data);say("Incident "+data.incident_reference+" submitted for human triage. Status: pending triage. Notify the responsible lead directly for urgent matters.");form.reset();
  }catch(err){console.error("Incident report submission failed:",err);say("Submission failed: "+(err.message||"Check your access and connection.")+". Do not delay urgent escalation.",true);}
  finally{button.disabled=false;}
 });
})();
