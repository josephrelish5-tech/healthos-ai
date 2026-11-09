/* Stage 4: read-only, clinic-scoped clinical safety overview. Existing RLS remains authoritative. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),state={clinicId:null,alerts:[],busy:false};
 const msg=(s,bad=false)=>{const e=$("healthosSafetyMessage");if(e){e.textContent=s;e.className="message"+(bad?" error":" success");}};
 const count=(id,n)=>{const e=$(id);if(e)e.textContent=String(n);};
 const date=s=>{const d=new Date(s);return s&&!Number.isNaN(d.getTime())?d.toLocaleString():"—";};
 const ref=s=>{s=String(s||"");return s.length>12?s.slice(0,8)+"…"+s.slice(-4):(s||"—");};
 function cell(row,value){const c=row.insertCell();c.textContent=String(value??"—");return c;}
 function render(){
  const body=$("healthosSafetyRows");if(!body)return;
  const sev=$("healthosSafetySeverity")?.value||"all",st=$("healthosSafetyStatus")?.value||"all";
  const rows=state.alerts.filter(a=>{const s=String(a.severity||"").toLowerCase(),r=["resolved","reviewed"].includes(String(a.status||"").toLowerCase());return(sev==="all"||s===sev)&&(st==="all"||(st==="open"&&!r)||(st==="reviewed"&&r));});
  body.replaceChildren();
  if(!rows.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=8;td.textContent=state.alerts.length?"No alerts match these filters.":"No rule-based safety alerts are currently recorded. This does not establish that patients are clinically clear.";return;}
  rows.forEach(a=>{const tr=body.insertRow();cell(tr,date(a.created_at));const s=String(a.severity||"unknown").toLowerCase(),sc=cell(tr,s.toUpperCase());sc.className="healthos-safety-severity healthos-safety-"+s;cell(tr,String(a.rule_code||"—").replaceAll("_"," "));cell(tr,a.observed_value??"—");cell(tr,a.alert_message||"—");cell(tr,ref(a.encounter_id));cell(tr,String(a.status||"open").replaceAll("_"," "));cell(tr,a.review_note||"Not yet reviewed");});
 }
 async function load(){
  if(state.busy)return;
  if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentClinic==="undefined"||!currentClinic?.id){msg("Sign in to an authorised hospital workspace. No clinical records have been requested.");return;}
  if(typeof currentUser==="undefined"||!currentUser?.id){msg("An authenticated staff session is required.",true);return;}
  const clinicId=currentClinic.id;state.busy=true;const b=$("healthosSafetyRefresh");if(b)b.disabled=true;msg("Loading clinic-scoped alerts through existing access policies…");
  try{
   const {data,error}=await supabaseClient.from("clinical_decision_support_alerts").select("id,clinic_id,encounter_id,rule_code,severity,observed_value,alert_message,status,created_at,review_note").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(200);
   if(error)throw error;
   if(typeof currentClinic==="undefined"||currentClinic?.id!==clinicId)throw new Error("The active hospital changed during loading. Refresh to load the correct clinic.");
   state.clinicId=clinicId;state.alerts=Array.isArray(data)?data:[];
   count("healthosSafetyCritical",state.alerts.filter(a=>String(a.severity||"").toLowerCase()==="critical").length);
   count("healthosSafetyHigh",state.alerts.filter(a=>String(a.severity||"").toLowerCase()==="high").length);
   count("healthosSafetyPending",state.alerts.filter(a=>!["resolved","reviewed"].includes(String(a.status||"").toLowerCase())).length);
   count("healthosSafetyReviewed",state.alerts.filter(a=>["resolved","reviewed"].includes(String(a.status||"").toLowerCase())).length);
   render();const u=$("healthosSafetyUpdated");if(u)u.textContent="Updated "+new Date().toLocaleTimeString();
   msg("Showing up to 200 most recent alerts for this clinic. Review and resolution remain in the authorised encounter workflow.");
  }catch(e){console.error("Safety command centre load failed",e);msg(e?.message||"Could not load alerts. No clinical record was changed.",true);const body=$("healthosSafetyRows");if(body){body.replaceChildren();const tr=body.insertRow(),td=tr.insertCell();td.colSpan=8;td.textContent="Alerts could not be loaded. Check access and retry.";}}
  finally{state.busy=false;if(b)b.disabled=false;}
 }
 $("healthosSafetyRefresh")?.addEventListener("click",()=>void load());
 $("healthosSafetySeverity")?.addEventListener("change",render);$("healthosSafetyStatus")?.addEventListener("change",render);
 let seen=null;setInterval(()=>{const id=typeof currentClinic!=="undefined"?currentClinic?.id||null:null;if(id&&id!==seen){seen=id;void load();void loadEscalations();}else if(!id&&seen){seen=null;state.clinicId=null;state.alerts=[];render();msg("Sign in to an authorised hospital workspace to load clinical safety alerts.");}},1500);
 setInterval(()=>{if(!document.hidden&&state.clinicId)void load();},60000);
 setInterval(()=>{if(!document.hidden&&state.clinicId)void loadEscalations();},60000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.clinicId)void load();});
 window.loadHealthOSSafetyCommandCentre=load;
 async function loadEscalations(){
  const panel=$("healthosDepartmentEscalationPanel");
  if(!panel)return;
  const admin=typeof managementVerified!=="undefined"&&managementVerified===true;
  panel.hidden=!admin;
  if(!admin)return;
  if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentClinic==="undefined"||!currentClinic?.id||typeof currentUser==="undefined"||!currentUser?.id){
   const m=$("healthosEscalationMessage");if(m)m.textContent="Sign in with a verified hospital administrator account to load escalation monitoring.";return;
  }
  const clinicId=currentClinic.id,button=$("healthosEscalationRefresh");
  if(button)button.disabled=true;
  const message=$("healthosEscalationMessage");if(message){message.textContent="Loading hospital-wide escalation records…";message.className="message";}
  try{
   const {data,error}=await supabaseClient.rpc("get_department_task_escalation_monitoring",{p_clinic_id:clinicId,p_status:null,p_severity:null,p_limit:200});
   if(error)throw error;
   if(typeof currentClinic==="undefined"||currentClinic?.id!==clinicId)throw new Error("Hospital context changed during loading. Refresh to load the correct clinic.");
   const result=data||{},counts=result.counts||{};
   ["open","acknowledged","critical","urgent"].forEach(k=>{const el=$("healthosEscalation"+k[0].toUpperCase()+k.slice(1));if(el)el.textContent=String(counts[k]??0);});
   const items=Array.isArray(result.items)?result.items:[];
   const severity=$("healthosEscalationSeverity")?.value||"all",status=$("healthosEscalationStatus")?.value||"active";
   const filtered=items.filter(x=>(severity==="all"||String(x.severity||"").toLowerCase()===severity)&&(status==="all"||status==="active"?status==="all"||["open","acknowledged"].includes(String(x.status||"").toLowerCase()):String(x.status||"").toLowerCase()===status));
   const body=$("healthosEscalationRows");if(body){body.replaceChildren();
    if(!filtered.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=9;td.textContent="No escalation records match the selected filters.";}
    filtered.forEach(x=>{const tr=body.insertRow();const put=v=>{const td=tr.insertCell();td.textContent=String(v??"—");return td;};
     put(x.created_at?new Date(x.created_at).toLocaleString():"—");put([x.department_name,x.unit_name].filter(Boolean).join(" / ")||"—");put(x.task_title||"—");
     const sev=put(String(x.severity||"—").toUpperCase());sev.className="healthos-safety-severity healthos-safety-"+String(x.severity||"").toLowerCase();
     put(String(x.status||"—").replaceAll("_"," "));put(x.due_at?new Date(x.due_at).toLocaleString():"—");put(x.reason||"—");put(x.resolution_notes||"No resolution recorded");
     const events=Array.isArray(x.events)?x.events:[];put(events.length?events.map(e=>[e.created_at?new Date(e.created_at).toLocaleString():"",String(e.action||"").replaceAll("_"," "),e.notes||""].filter(Boolean).join(" — ")).join("\n"):"No response events recorded");
    });
   }
   const updated=$("healthosEscalationUpdated");if(updated)updated.textContent="Updated "+new Date().toLocaleTimeString();
   if(message){message.textContent="Loaded "+items.length+" escalation record(s). Server-side owner/administrator verification and clinic scope were applied.";message.className="message success";}
  }catch(error){console.error("Department escalation monitoring failed",error);if(message){message.textContent=error?.message||"Could not load escalation records. No task or escalation status was changed.";message.className="message error";}const body=$("healthosEscalationRows");if(body){body.replaceChildren();const tr=body.insertRow(),td=tr.insertCell();td.colSpan=9;td.textContent="Escalation monitoring could not be loaded. Check administrator access and retry.";}}
  finally{if(button)button.disabled=false;}
 }
 $("healthosEscalationRefresh")?.addEventListener("click",()=>void loadEscalations());
 $("healthosEscalationSeverity")?.addEventListener("change",()=>void loadEscalations());
 $("healthosEscalationStatus")?.addEventListener("change",()=>void loadEscalations());
 window.loadHealthOSDepartmentEscalationMonitor=loadEscalations;


 async function loadClinicalIncidents(){
  const panel=$("healthosClinicalIncidentIntegration");if(!panel)return;
  const admin=typeof managementVerified!=="undefined"&&managementVerified===true;panel.hidden=!admin;if(!admin)return;
  const message=$("healthosClinicalIncidentMessage"),button=$("healthosClinicalIncidentRefresh");
  if(typeof supabaseClient==="undefined"||!supabaseClient||typeof currentClinic==="undefined"||!currentClinic?.id||typeof currentUser==="undefined"||!currentUser?.id){if(message)message.textContent="Sign in with a verified hospital administrator account to load the overview.";return;}
  const clinicId=currentClinic.id;if(button)button.disabled=true;
  if(message){message.textContent="Loading permitted incident sources. Database access policies remain in force.";message.className="message";}
  try{
   const requests=[
    ["Hospital incident register",supabaseClient.from("hospital_incident_reports").select("incident_reference,category,severity,department_name,reported_at,status,escalation_required").eq("clinic_id",clinicId).order("reported_at",{ascending:false}).limit(100)],
    ["Laboratory critical results",supabaseClient.from("laboratory_test_results").select("id,request_id,is_critical,status,entered_at").eq("clinic_id",clinicId).eq("is_critical",true).order("entered_at",{ascending:false}).limit(100)],
    ["Radiology critical findings",supabaseClient.from("radiology_reports").select("id,request_id,critical_finding,status,entered_at").eq("clinic_id",clinicId).eq("critical_finding",true).order("entered_at",{ascending:false}).limit(100)],
    ["ICU emergency incidents",supabaseClient.from("icu_emergency_incidents").select("id,incident_type,severity,status,occurred_at,created_at").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(100)],
    ["Clinical decision-support alerts",supabaseClient.from("clinical_decision_support_alerts").select("id,rule_code,severity,status,created_at").eq("clinic_id",clinicId).order("created_at",{ascending:false}).limit(100)]
   ];
   const settled=await Promise.allSettled(requests.map(x=>x[1]));
   if(typeof currentClinic==="undefined"||currentClinic?.id!==clinicId)throw new Error("Hospital context changed during loading. Refresh to load the correct clinic.");
   const events=[],available=[],restricted=[],makeRef=(p,id)=>p+" · "+String(id||"").slice(0,8);
   settled.forEach((result,index)=>{
    const source=requests[index][0];if(result.status!=="fulfilled"||result.value.error){restricted.push(source);return;}available.push(source);
    (result.value.data||[]).forEach(row=>{let e=null;
     if(index===0)e={source,reference:row.incident_reference,department:row.department_name||"Hospital incident",kind:String(row.category||"incident").replaceAll("_"," "),severity:row.severity,status:row.status,at:row.reported_at};
     if(index===1)e={source,reference:makeRef("LAB",row.id),department:"Laboratory",kind:"Critical test result",severity:"critical",status:row.status,at:row.entered_at};
     if(index===2)e={source,reference:makeRef("RAD",row.id),department:"Radiology",kind:"Critical imaging finding",severity:"critical",status:row.status,at:row.entered_at};
     if(index===3)e={source,reference:makeRef("ICU",row.id),department:"ICU",kind:String(row.incident_type||"emergency").replaceAll("_"," "),severity:row.severity,status:row.status,at:row.occurred_at||row.created_at};
     if(index===4)e={source,reference:makeRef("CDS",row.id),department:"Clinical decision support",kind:String(row.rule_code||"clinical alert").replaceAll("_"," "),severity:row.severity,status:row.status,at:row.created_at};
     if(e)events.push(e);
    });
   });
   const done=e=>["resolved","closed","released"].includes(String(e.status||"").toLowerCase()),active=events.filter(e=>!done(e));
   $("healthosIncidentOpenCount").textContent=String(active.length);
   $("healthosIncidentCriticalCount").textContent=String(active.filter(e=>String(e.severity||"").toLowerCase()==="critical").length);
   $("healthosIncidentUrgentCount").textContent=String(active.filter(e=>["urgent","high"].includes(String(e.severity||"").toLowerCase())).length);
   $("healthosIncidentSourcesCount").textContent=available.length+" / "+requests.length;
   const sev=$("healthosIncidentSeverity")?.value||"all",status=$("healthosIncidentStatus")?.value||"active";
   const filtered=events.filter(e=>(sev==="all"||String(e.severity||"").toLowerCase()===sev)&&(status==="all"||(status==="active"?!done(e):done(e))));
   filtered.sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
   const body=$("healthosClinicalIncidentRows");if(body){body.replaceChildren();if(!filtered.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=6;td.textContent="No permitted incident records match these filters. This is not proof that no clinical risk exists.";}filtered.forEach(e=>{const tr=body.insertRow(),put=v=>{const td=tr.insertCell();td.textContent=String(v??"—");return td;};put(e.at?new Date(e.at).toLocaleString():"—");put(e.source);put(e.reference);put([e.department,e.kind].filter(Boolean).join(" · "));const sv=put(String(e.severity||"unrated").toUpperCase());sv.className="healthos-safety-severity healthos-safety-"+String(e.severity||"").toLowerCase();put(String(e.status||"—").replaceAll("_"," "));});}
   const updated=$("healthosIncidentUpdated");if(updated)updated.textContent="Updated "+new Date().toLocaleTimeString();
   if(message){message.textContent="Loaded "+events.length+" event(s) from "+available.length+" permitted source(s)."+(restricted.length?" Restricted by existing database permissions: "+restricted.join(", ")+".":" All five sources were accessible.");message.className=restricted.length?"message":"message success";}
  }catch(error){console.error("Clinical incident integration failed",error);if(message){message.textContent=error?.message||"Could not load the incident overview. No clinical record was changed.";message.className="message error";}}
  finally{if(button)button.disabled=false;}
 }
 $("healthosClinicalIncidentRefresh")?.addEventListener("click",()=>void loadClinicalIncidents());
 $("healthosIncidentSeverity")?.addEventListener("change",()=>void loadClinicalIncidents());
 $("healthosIncidentStatus")?.addEventListener("change",()=>void loadClinicalIncidents());
 window.loadHealthOSClinicalIncidentIntegration=loadClinicalIncidents;
 setInterval(()=>{if(!document.hidden&&typeof currentClinic!=="undefined"&&currentClinic?.id&&typeof managementVerified!=="undefined"&&managementVerified===true)void loadClinicalIncidents();},90000);

})();
