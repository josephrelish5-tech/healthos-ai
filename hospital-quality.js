/* HealthOS AI — clinic-scoped quality, accreditation and performance register.
   Client submissions are append-only and remain pending human review. */
(() => {
 "use strict";
 const $ = id => document.getElementById(id);
 const typeLabels = {quality_indicator:"Quality indicator",improvement_plan:"Improvement plan",accreditation_assessment:"Accreditation assessment",patient_feedback:"Patient feedback"};
 const message = (text, kind="") => { const el=$("qualityMessage"); if(el){el.textContent=text;el.className="message "+kind;} };
 const numberOrNull = id => { const v=$(id)?.value.trim(); return v===""||v==null?null:Number(v); };
 const value = id => $(id)?.value.trim() || null;
 const clinicId = () => typeof currentClinic !== "undefined" && currentClinic ? (currentClinic.id || currentClinic.clinic_id || null) : null;
 async function loadRecords(){
  if(typeof supabaseClient==="undefined" || typeof currentUser==="undefined" || !currentUser || !clinicId()){message("Sign in and select an active clinic to load quality records.","error");return;}
  const {data,error}=await supabaseClient.from("hospital_quality_records").select("*").eq("clinic_id",clinicId()).order("created_at",{ascending:false}).limit(250);
  if(error){message("Could not load quality register: "+error.message,"error");return;}
  const rows=data||[];
  const counts={quality_indicator:0,improvement_plan:0,accreditation_assessment:0,patient_feedback:0};
  rows.forEach(r=>counts[r.record_type]=(counts[r.record_type]||0)+1);
  $("qualityIndicatorCount").textContent=counts.quality_indicator;
  $("qualityImprovementCount").textContent=counts.improvement_plan;
  $("qualityAccreditationCount").textContent=counts.accreditation_assessment;
  $("qualityFeedbackCount").textContent=counts.patient_feedback;
  const body=$("qualityRecordsBody");
  body.replaceChildren();
  if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=8;td.textContent="No quality records submitted yet.";tr.append(td);body.append(tr);}
  rows.forEach(r=>{
   const tr=document.createElement("tr");
   const cells=[r.record_reference,typeLabels[r.record_type]||r.record_type,r.title,r.department_name,r.accountable_owner||"—",(r.target_value??"—")+" / "+(r.actual_value??"—"),r.due_date||"—",r.status];
   cells.forEach(v=>{const td=document.createElement("td");td.textContent=String(v);tr.append(td);});
   body.append(tr);
  });
  message("Loaded "+rows.length+" clinic quality records. All new submissions remain pending authorised review.","success");
 }
 async function submitRecord(event){
  event.preventDefault();
  if(typeof supabaseClient==="undefined" || typeof currentUser==="undefined" || !currentUser || !clinicId()){message("Sign in and select an active clinic before submitting.","error");return;}
  const start=value("qualityPeriodStart"),end=value("qualityPeriodEnd");
  if(start&&end&&end<start){message("Reporting period end cannot be earlier than its start.","error");return;}
  const type=value("qualityRecordType");
  const record={
   clinic_id:clinicId(),created_by:currentUser.id,
   record_reference:"QLT-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase(),
   record_type:type,title:value("qualityTitle"),department_name:value("qualityDepartment"),
   accountable_owner:value("qualityOwner"),framework:value("qualityFramework"),
   indicator_definition:value("qualityDefinition"),measurement_unit:value("qualityUnit"),
   target_value:numberOrNull("qualityTarget"),actual_value:numberOrNull("qualityActual"),
   baseline_value:numberOrNull("qualityBaseline"),reporting_period_start:start,reporting_period_end:end,
   due_date:value("qualityDueDate"),improvement_target:value("qualityImprovementTarget"),
   action_plan:value("qualityActionPlan"),outcome_summary:value("qualityOutcome"),
   feedback_rating:numberOrNull("qualityRating"),feedback_comment:type==="patient_feedback"?value("qualityOutcome"):null,
   evidence_reference:value("qualityEvidenceReference"),status:"pending_review"
  };
  if(type==="patient_feedback" && (record.title.toLowerCase().includes("patient name") || (record.feedback_comment||"").match(/\b\+?\d{8,}\b/))){message("Remove identifying patient information before submitting anonymous feedback.","error");return;}
  const button=$("qualitySubmitButton");button.disabled=true;
  const {error}=await supabaseClient.from("hospital_quality_records").insert(record);
  button.disabled=false;
  if(error){message("Submission failed: "+error.message,"error");return;}
  $("hospitalQualityForm").reset();
  message("Quality record submitted successfully for authorised human review.","success");
  await loadRecords();
 }
 document.addEventListener("DOMContentLoaded",()=>{
  $("hospitalQualityForm")?.addEventListener("submit",submitRecord);
  $("qualityRefreshButton")?.addEventListener("click",loadRecords);
 });
 window.healthOSLoadQualityRecords=loadRecords;
})();