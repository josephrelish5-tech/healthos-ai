/* HealthOS AI · Stage 5D Part 2Y — Governance & institutional lessons.
   Separate additive module; does not modify the main application bundle. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const host=$("investigationGovernanceMessage"), departments=$("investigationGovernanceDepartments"),
 lessons=$("investigationGovernanceLessons"), oversight=$("investigationGovernanceOversight"), recs=$("investigationGovernanceRecommendations");
 if(!host||!departments||!lessons||!oversight||!recs)return;
 const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=String(txt);if(cls)n.className=cls;return n;};
 const msg=(s,bad)=>{host.textContent=s;host.classList.toggle("error",!!bad);};
 const client=()=>window.supabaseClient||window.supabase;
 function clinic(){return window.currentClinic||window.activeClinic||window.selectedClinic||null;}
 function section(title,body){const box=el("article",undefined,"card");box.append(el("h4",title));box.append(body);return box;}
 async function load(){
  const c=clinic(),sb=client();if(!c?.id||!sb?.rpc){msg("Sign in as a hospital owner or administrator after the Part 2Y migration is deployed.");return;}
  const btn=$("refreshInvestigationGovernance");if(btn)btn.disabled=true;
  try{
   const {data,error}=await sb.rpc("get_hospital_investigation_governance_register",{p_clinic_id:c.id});if(error)throw error;
   departments.replaceChildren();lessons.replaceChildren();oversight.replaceChildren();recs.replaceChildren();
   (data.department_risk_history||[]).forEach(d=>{const b=el("div");b.append(el("strong",d.department+" · "+d.risk_band.replaceAll("_"," ")));b.append(el("p",d.confirmed_findings+" confirmed finding(s) · "+d.ineffective_or_partial_reviews+" partial/ineffective review(s) · "+d.recurrence_observations+" recurrence observation(s)"));b.append(el("p",d.interpretation,"muted"));departments.append(section("Department history",b));});
   (data.lessons_learned||[]).forEach(x=>{const b=el("div");b.append(el("h4",x.title));b.append(el("p",x.detail));b.append(el("p","Evidence basis: "+x.evidence_basis));lessons.append(section("Institutional lesson",b));});
   (data.management_accountability||[]).forEach(x=>{const b=el("div");b.append(el("strong",x.management_role+" · "+x.department+" · "+x.decision.replaceAll("_"," ")));b.append(el("p",x.rationale));b.append(el("p","Due: "+(x.due_date||"Not set")));oversight.append(section("Management accountability",b));});
   (data.institutional_recommendations||[]).forEach(x=>{const b=el("div");b.append(el("p",x.recommendation));b.append(el("p",x.department+" · "+x.priority+" · review by "+(x.review_by_date||"not set")));(x.events||[]).forEach(e=>b.append(el("p",e.status+" · "+e.note)));recs.append(section("Institutional recommendation",b));});
   msg("Governance register loaded. Department bands are historical review priorities, not staff performance scores or misconduct findings.");
  }catch(e){console.error("Governance register failed",e);msg(e?.message||"Governance register could not be loaded.",true);}
  finally{if(btn)btn.disabled=false;}
 }
 $("refreshInvestigationGovernance")?.addEventListener("click",()=>void load());
 $("recordInvestigationLesson")?.addEventListener("click",async()=>{
  const c=clinic(),sb=client();if(!c?.id||!sb?.rpc)return;
  const finding=window.prompt("Paste the confirmed finding ID:");if(!finding)return;
  const title=window.prompt("Lesson title (8–240 characters):");if(!title)return;
  const detail=window.prompt("What should the institution learn? (30–5,000 characters):");if(!detail)return;
  const evidence=window.prompt("Evidence basis (10–3,000 characters):");if(!evidence)return;
  try{const {error}=await sb.rpc("record_hospital_investigation_lesson",{p_clinic_id:c.id,p_finding_id:finding,p_title:title,p_detail:detail,p_departments:[],p_evidence_basis:evidence});if(error)throw error;msg("Institutional lesson recorded.");await load();}catch(e){msg(e?.message||"Lesson could not be recorded.",true);}
 });
 $("recordInvestigationGovernance")?.addEventListener("click",async()=>{
  const c=clinic(),sb=client();if(!c?.id||!sb?.rpc)return;
  const finding=window.prompt("Paste the confirmed finding ID:");if(!finding)return;
  const role=window.prompt("Accountable management role (e.g. Medical Director):");if(!role)return;
  const dept=window.prompt("Accountable department:");if(!dept)return;
  const decisions=["accept_accountability","assign_management_review","allocate_resources","policy_review","escalate_board","monitor"];
  const decision=window.prompt("Decision: "+decisions.join(", "),"assign_management_review");if(!decisions.includes(decision))return;
  const rationale=window.prompt("Management rationale (20–4,000 characters):");if(!rationale)return;
  const due=window.prompt("Due date YYYY-MM-DD (optional):","");if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))return;
  try{const {error}=await sb.rpc("record_hospital_investigation_governance",{p_clinic_id:c.id,p_finding_id:finding,p_role:role,p_department:dept,p_decision:decision,p_rationale:rationale,p_responsible_user_id:null,p_due_date:due||null});if(error)throw error;msg("Management accountability record saved.");await load();}catch(e){msg(e?.message||"Governance record failed.",true);}
 });
 $("recordInstitutionalRecommendation")?.addEventListener("click",async()=>{
  const c=clinic(),sb=client();if(!c?.id||!sb?.rpc)return;
  const finding=window.prompt("Paste the confirmed finding ID:");if(!finding)return;
  const recommendation=window.prompt("Institutional recommendation (20–4,000 characters):");if(!recommendation)return;
  const dept=window.prompt("Target department:");if(!dept)return;
  const priority=window.prompt("Priority: routine, important, urgent","important");if(!["routine","important","urgent"].includes(priority))return;
  const date=window.prompt("Review-by date YYYY-MM-DD (optional):","");if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
  try{const {error}=await sb.rpc("record_hospital_investigation_recommendation",{p_clinic_id:c.id,p_finding_id:finding,p_recommendation:recommendation,p_department:dept,p_priority:priority,p_review_by_date:date||null});if(error)throw error;msg("Institutional recommendation recorded for governance review.");await load();}catch(e){msg(e?.message||"Recommendation could not be recorded.",true);}
 });
 window.loadInvestigationGovernanceRegister=load;
 document.addEventListener("DOMContentLoaded",()=>{if(clinic())void load();});
})();