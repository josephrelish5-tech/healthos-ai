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
 let seen=null;setInterval(()=>{const id=typeof currentClinic!=="undefined"?currentClinic?.id||null:null;if(id&&id!==seen){seen=id;void load();}else if(!id&&seen){seen=null;state.clinicId=null;state.alerts=[];render();msg("Sign in to an authorised hospital workspace to load clinical safety alerts.");}},1500);
 setInterval(()=>{if(!document.hidden&&state.clinicId)void load();},60000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&state.clinicId)void load();});
 window.loadHealthOSSafetyCommandCentre=load;
})();
