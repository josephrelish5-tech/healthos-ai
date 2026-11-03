/* HealthOS AI — clinical governance and patient-safety review intake.
   Append-only submissions; no automated clinical conclusions or status changes. */
(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const labels={mortality_review:"Mortality review",morbidity_review:"Morbidity review",serious_adverse_event:"Serious adverse event",near_miss_review:"Near-miss review",root_cause_analysis:"Root-cause analysis",clinical_audit:"Clinical audit",case_conference:"Clinical case conference",sentinel_event_review:"Sentinel event review"};
 const say=(t,bad=false)=>{const el=$("governanceMessage");if(el){el.textContent=t;el.className="message "+(bad?"error":"success");}};
 const val=id=>$(id)?.value.trim()||null;
 const getClinic=()=>typeof currentClinic!=="undefined"&&currentClinic?(currentClinic.id||currentClinic.clinic_id||null):null;
 async function load(){
  if(typeof supabaseClient==="undefined"||typeof currentUser==="undefined"||!currentUser||!getClinic()){say("Sign in and select an active clinic to load reviews.",true);return;}
  const {data,error}=await supabaseClient.from("clinical_governance_reviews").select("*").eq("clinic_id",getClinic()).order("created_at",{ascending:false}).limit(250);
  if(error){say("Could not load governance register: "+error.message,true);return;}
  const rows=data||[];
  $("governanceMortalityCount").textContent=rows.filter(r=>r.review_type==="mortality_review").length;
  $("governanceAdverseCount").textContent=rows.filter(r=>["serious_adverse_event","sentinel_event_review"].includes(r.review_type)).length;
  $("governanceNearMissCount").textContent=rows.filter(r=>r.review_type==="near_miss_review").length;
  $("governancePendingCount").textContent=rows.filter(r=>r.status==="pending_governance_review").length;
  const body=$("governanceReviewRows");body.replaceChildren();
  if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=8;td.textContent="No clinical governance reviews submitted yet.";tr.append(td);body.append(tr);}
  rows.forEach(r=>{const tr=document.createElement("tr");[r.review_reference,labels[r.review_type]||r.review_type,r.department_name,r.event_date,r.harm_level,r.action_owner||"—",r.action_due_date||"—",r.status].forEach(v=>{const td=document.createElement("td");td.textContent=String(v??"—");tr.append(td);});body.append(tr);});
  say("Loaded "+rows.length+" governance records. New records remain pending authorised review.");
 }
 async function submit(e){
  e.preventDefault();
  if(typeof supabaseClient==="undefined"||typeof currentUser==="undefined"||!currentUser||!getClinic()){say("Sign in and select an active clinic first.",true);return;}
  const eventDate=val("governanceEventDate"),due=val("governanceActionDueDate");
  if(!eventDate||eventDate>new Date().toISOString().slice(0,10)){say("Enter a valid event date that is not in the future.",true);return;}
  if(due&&due<new Date().toISOString().slice(0,10)){say("Action due date cannot be in the past.",true);return;}
  const summary=val("governanceEventSummary");
  if(!summary||summary.length<10){say("Provide a factual event summary of at least 10 characters.",true);return;}
  const type=val("governanceReviewType");
  const ref="CG-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
  const record={clinic_id:getClinic(),submitted_by:currentUser.id,review_reference:ref,linked_incident_reference:val("governanceIncidentReference"),review_type:type,department_name:val("governanceDepartment"),event_date:eventDate,harm_level:val("governanceHarmLevel"),event_summary:summary,immediate_actions:val("governanceImmediateActions"),contributing_factors:val("governanceContributingFactors"),review_findings:val("governanceFindings"),recommendations:val("governanceRecommendations"),action_owner:val("governanceActionOwner"),action_due_date:due,learning_points:val("governanceLearningPoints"),evidence_reference:val("governanceEvidenceReference"),status:"pending_governance_review"};
  // Reject obvious identifiers; staff must use the hospital's separate case code.
  const sensitivePattern=/(\b(?:mrn|hospital number|patient name|phone number|telephone)\s*[:#-])/i;
  if(sensitivePattern.test(summary)){say("Remove patient identifiers and use a separately controlled case reference.",true);return;}
  const button=$("governanceSubmitButton");button.disabled=true;
  const {error}=await supabaseClient.from("clinical_governance_reviews").insert(record);
  button.disabled=false;
  if(error){say("Submission failed: "+error.message,true);return;}
  $("clinicalGovernanceForm").reset();
  say("Review "+ref+" submitted. It is awaiting authorised governance review; urgent events must also be escalated directly.");
  await load();
 }
 document.addEventListener("DOMContentLoaded",()=>{
  $("clinicalGovernanceForm")?.addEventListener("submit",submit);
  $("governanceRefreshButton")?.addEventListener("click",load);
 });
 window.healthOSLoadClinicalGovernance=load;
})();