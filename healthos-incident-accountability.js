/* Stage 4D — administrator incident accountability workspace. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 const state={clinicId:null,items:[],selected:null,departments:[],staff:[],assignments:[],busy:false};
 const admin=()=>typeof managementVerified!=="undefined"&&managementVerified===true;
 const client=()=>typeof supabaseClient!=="undefined"&&supabaseClient;
 const clinic=()=>typeof currentClinic!=="undefined"&&currentClinic?.id?currentClinic:null;
 const user=()=>typeof currentUser!=="undefined"&&currentUser?.id?currentUser:null;
 const say=(s,bad=false)=>{const e=$("incidentWorkflowMessage");if(e){e.textContent=s;e.className="message"+(bad?" error":" success");}};
 const fmt=v=>{if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString();};
 const put=(tr,v)=>{const td=tr.insertCell();td.textContent=String(v??"—");return td;};
 function rpcArgs(action,extra={}){return {p_clinic_id:state.clinicId,p_incident_report_id:state.selected?.incident_report_id,p_action:action,...extra};}
 function fillSelect(el,items,label){el.replaceChildren();const first=document.createElement("option");first.value="";first.textContent=label;el.append(first);items.forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.label;el.append(o);});}
 function staffForDepartment(){
  const dept=$("incidentWorkflowDepartment").value;
  const ids=new Set(state.assignments.filter(a=>a.department_id===dept).map(a=>a.staff_profile_id));
  const eligible=state.staff.filter(s=>ids.has(s.id)&&s.employment_status==="active");
  fillSelect($("incidentWorkflowStaff"),eligible.map(s=>({id:s.id,label:s.full_name+" — "+(s.professional_role||"Staff")})),"Select active assigned staff");
 }
 function render(){
  const body=$("incidentWorkflowRows");if(!body)return;
  const filter=$("incidentWorkflowStatus").value;
  const items=state.items.filter(x=>filter==="all"||x.workflow_status===filter);
  body.replaceChildren();
  if(!items.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=8;td.textContent="No incidents match this workflow filter.";return;}
  items.forEach(x=>{
   const tr=body.insertRow();const ref=put(tr,x.incident_reference);ref.textContent=x.incident_reference+" — "+(x.incident_title||"Incident");
   const sev=put(tr,String(x.severity||"—").toUpperCase());sev.className="healthos-safety-severity healthos-safety-"+String(x.severity||"").toLowerCase();
   put(tr,x.reported_department);put(tr,[x.assigned_department,x.assigned_staff].filter(Boolean).join(" / ")||"Unassigned");
   put(tr,String(x.workflow_status||"—").replaceAll("_"," "));
   const due=put(tr,fmt(x.response_due_at)+(x.is_overdue?" · OVERDUE":""));if(x.is_overdue)due.className="incident-workflow-overdue";
   put(tr,"Ack: "+fmt(x.acknowledged_at)+"\nResolved: "+fmt(x.resolved_at));
   const action=put(tr,"");const b=document.createElement("button");b.type="button";b.className="logout-button";b.textContent=state.selected?.workflow_id===x.workflow_id?"Selected":"Manage";b.addEventListener("click",()=>select(x));action.append(b);
  });
  const open=state.items.filter(x=>!["resolved","closed"].includes(x.workflow_status));
  $("incidentWorkflowTriage").textContent=state.items.filter(x=>x.workflow_status==="triage_pending").length;
  $("incidentWorkflowAssigned").textContent=state.items.filter(x=>["assigned","acknowledged","response_in_progress"].includes(x.workflow_status)).length;
  $("incidentWorkflowOverdue").textContent=state.items.filter(x=>x.is_overdue).length;
  $("incidentWorkflowResolved").textContent=state.items.filter(x=>["resolved","closed"].includes(x.workflow_status)).length;
 }
 function renderTimeline(x){
  const list=$("incidentWorkflowTimeline");if(!list)return;
  list.replaceChildren();
  const events=Array.isArray(x?.events)?x.events:[];
  if(!events.length){const li=document.createElement("li");li.textContent="No event history is available for this workflow.";list.append(li);return;}
  const labels={report_received:"Incident received",assigned:"Department and staff assigned",reassigned:"Assignment changed",acknowledged:"Staff acknowledgment",response_recorded:"Response recorded",resolved:"Human administrator resolved incident",reopened:"Incident reopened",note_added:"Workflow note added"};
  events.forEach(ev=>{
   const li=document.createElement("li"),title=document.createElement("strong"),detail=document.createElement("p"),meta=document.createElement("small");
   title.textContent=labels[ev.event_type]||String(ev.event_type||"Workflow event").replaceAll("_"," ");
   detail.textContent=ev.event_note||"No additional note recorded.";
   meta.textContent=fmt(ev.created_at)+" · Actor account: "+(ev.actor_user_id||"System");
   li.append(title,detail,meta);list.append(li);
  });
 }
 function select(x){
  state.selected=x;
  $("incidentWorkflowSelected").textContent=x.incident_reference+" · "+x.incident_title+" · "+x.workflow_status.replaceAll("_"," ");
  $("incidentWorkflowDepartment").value=x.department_id||"";
  staffForDepartment();$("incidentWorkflowStaff").value=x.assigned_staff_profile_id||"";
  $("incidentWorkflowDue").value=x.response_due_at?new Date(new Date(x.response_due_at).getTime()-new Date(x.response_due_at).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
  const status=x.workflow_status;
  $("incidentWorkflowAcknowledge").disabled=!["assigned","acknowledged"].includes(status);
  $("incidentWorkflowRespond").disabled=!["acknowledged","response_in_progress"].includes(status);
  $("incidentWorkflowResolve").disabled=!["acknowledged","response_in_progress"].includes(status);
  $("incidentWorkflowReopen").disabled=status!=="resolved";
  renderTimeline(x);
  render();
 }
 async function load(){
  if(state.busy)return;
  if(!admin()){ $("healthosIncidentAccountability").hidden=true;state.clinicId=null;state.items=[];state.selected=null;return;}
  if(!client()||!clinic()||!user()){say("Sign in to a verified hospital administrator account.");return;}
  const clinicId=clinic().id;state.busy=true;$("healthosIncidentAccountability").hidden=false;$("incidentWorkflowRefresh").disabled=true;say("Loading the secured incident accountability queue…");
  try{
   const [queue,depts,staff,assignments]=await Promise.all([
    supabaseClient.rpc("get_admin_hospital_incident_workflows",{p_clinic_id:clinicId,p_limit:300}),
    supabaseClient.from("clinic_departments").select("id,department_name").eq("clinic_id",clinicId).eq("is_active",true).order("department_name"),
    supabaseClient.from("staff_profiles").select("id,full_name,professional_role,employment_status").eq("clinic_id",clinicId).eq("employment_status","active").order("full_name"),
    supabaseClient.from("staff_department_assignments").select("staff_profile_id,department_id").eq("clinic_id",clinicId).eq("assignment_status","active")
   ]);
   for(const r of [queue,depts,staff,assignments])if(r.error)throw r.error;
   if(!clinic()||clinic().id!==clinicId)throw Error("Hospital context changed while loading. Refresh to load the correct hospital.");
   state.clinicId=clinicId;state.items=Array.isArray(queue.data?.items)?queue.data.items:[];
   state.departments=depts.data||[];state.staff=staff.data||[];state.assignments=assignments.data||[];
   fillSelect($("incidentWorkflowDepartment"),state.departments.map(d=>({id:d.id,label:d.department_name})),"Select responsible department");
   if(state.selected){const latest=state.items.find(x=>x.workflow_id===state.selected.workflow_id);if(latest)select(latest);else state.selected=null;}
   render();$("incidentWorkflowUpdated").textContent="Updated "+new Date().toLocaleTimeString();
   say("Loaded "+state.items.length+" workflow record(s). Assignment, acknowledgment, response and resolution permissions are enforced by the database.");
  }catch(e){console.error("Incident accountability load failed",e);say(e.message||"Could not load incident workflows. No record was changed.",true);}
  finally{state.busy=false;$("incidentWorkflowRefresh").disabled=false;}
 }
 async function act(action,extra={}){
  if(!state.selected||!state.clinicId)return;
  const buttons=["incidentWorkflowAssign","incidentWorkflowAcknowledge","incidentWorkflowRespond","incidentWorkflowResolve","incidentWorkflowReopen"];
  buttons.forEach(id=>{const b=$(id);if(b)b.disabled=true;});
  try{
   const {data,error}=await supabaseClient.rpc("manage_hospital_incident_workflow",rpcArgs(action,extra));
   if(error)throw error;
   say("Recorded "+action.replaceAll("_"," ")+" successfully. Refreshing the accountability history.");
   await load();
  }catch(e){say(e.message||"The requested action was not accepted. No workflow change was confirmed.",true);}
  finally{buttons.forEach(id=>{const b=$(id);if(b)b.disabled=false;});if(state.selected)select(state.items.find(x=>x.workflow_id===state.selected.workflow_id)||state.selected);}
 }
 $("incidentWorkflowRefresh")?.addEventListener("click",()=>void load());
 $("incidentWorkflowStatus")?.addEventListener("change",render);
 $("incidentWorkflowDepartment")?.addEventListener("change",staffForDepartment);
 $("incidentWorkflowAssignForm")?.addEventListener("submit",async e=>{
  e.preventDefault();if(!state.selected)return say("Select an incident first.",true);
  const dept=$("incidentWorkflowDepartment").value,staff=$("incidentWorkflowStaff").value;
  if(!dept||!staff)return say("Choose a department and an active staff member.",true);
  const raw=$("incidentWorkflowDue").value;
  const due=raw?new Date(raw).toISOString():null;
  await act("assign",{p_department_id:dept,p_staff_profile_id:staff,p_due_at:due});
 });
 $("incidentWorkflowAcknowledge")?.addEventListener("click",()=>void act("acknowledge"));
 $("incidentWorkflowRespond")?.addEventListener("click",()=>{const note=prompt("Enter a factual response summary. Do not include unnecessary patient identifiers.");if(note!==null)void act("respond",{p_note:note});});
 $("incidentWorkflowResolve")?.addEventListener("click",()=>{const note=prompt("Enter the human administrator's resolution notes (at least 10 characters).");if(note===null)return;const evidence=prompt("Enter the approved evidence reference (document ID or secure storage reference).");if(evidence!==null)void act("resolve",{p_note:note,p_evidence_reference:evidence});});
 $("incidentWorkflowReopen")?.addEventListener("click",()=>{if(confirm("Reopen this resolved incident for further human review?"))void act("reopen");});
 let previous=null;
 setInterval(()=>{const id=clinic()?.id||null,verified=admin();if(!verified){if(previous||state.items.length){state.items=[];state.selected=null;state.clinicId=null;$("healthosIncidentAccountability").hidden=true;render();}previous=null;return;}if(id&&id!==previous){previous=id;void load();}else if(!id&&previous){previous=null;state.items=[];state.selected=null;$("healthosIncidentAccountability").hidden=true;render();}},1800);
 setInterval(()=>{if(!document.hidden&&admin()&&state.clinicId)void load();},60000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&admin()&&state.clinicId)void load();});
 window.loadHealthOSIncidentAccountability=load;
})();