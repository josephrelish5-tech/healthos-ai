/* HealthOS Telemedicine Operations — patient consent, private video sessions,
   remote observations and secure follow-up. All writes use authorised RPCs. */
(()=>{"use strict";
const $=id=>document.getElementById(id), esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clinic=()=>typeof currentClinic!=="undefined"&&currentClinic?currentClinic.id:null;
const db=()=>typeof supabaseClient!=="undefined"?supabaseClient:null;
const user=()=>typeof currentUser!=="undefined"&&currentUser?currentUser:null;
const say=(id,s,b=false)=>{const e=$(id);if(e){e.textContent=s;e.className="message"+(b?" error":" success");}};
async function rpc(name,args){if(!db())throw Error("Sign in again; database is not ready.");const {data,error}=await db().rpc(name,args);if(error)throw error;return data;}
async function provider(body){const {data,error}=await db().functions.invoke("healthos-telemedicine-provider",{body});if(error)throw error; if(data?.error)throw Error(data.error);return data;}
function addStyles(){if($("telemedicineOpsStyles"))return;const s=document.createElement("style");s.id="telemedicineOpsStyles";s.textContent='.telemed-card{border:1px solid #e5eaf0;border-radius:14px;padding:16px;margin:14px 0;background:#fff}.telemed-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.telemed-card label{display:block;margin:9px 0}.telemed-card input,.telemed-card select,.telemed-card textarea{max-width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccd5df;border-radius:8px}.telemed-card button{margin:3px}.telemed-muted{color:#64748b;font-size:.92rem}';document.head.append(s);}
function mountStaff(){const root=$("telemedicineDashboard");if(!root||$("telemedicineOperationsPanel"))return;
 const p=document.createElement("section");p.id="telemedicineOperationsPanel";p.className="panel";p.innerHTML='<div class="panel-heading"><div><p class="eyebrow">CLINICAL OPERATIONS</p><h3>Consultation sessions &amp; patient follow-up</h3><p class="muted">Prepare private sessions only after the patient has granted consent. Provider access is issued as short-lived, participant-specific tokens.</p></div><button id="telemedOpsRefresh" class="primary-button" type="button">Refresh sessions</button></div><p id="telemedOpsMessage" class="message" role="status"></p><h3>Accepted remote requests awaiting session preparation</h3><div id="telemedAcceptedRequests"></div><h3>Prepared / active consultations</h3><div id="telemedClinicSessions"></div>';
 root.append(p);$("telemedOpsRefresh").addEventListener("click",loadStaff);
}
function mountPatient(){const root=$("patientPortal");if(!root||$("patientTelemedicinePanel"))return;
 const p=document.createElement("section");p.id="patientTelemedicinePanel";p.className="panel";p.innerHTML='<div class="panel-heading"><div><p class="eyebrow">PATIENT ACCESS</p><h2>My virtual consultations</h2><p class="muted">Review your remote visits, manage consent, share home observations and contact your care team.</p></div><button id="patientTelemedRefresh" type="button" class="primary-button">Refresh</button></div><p id="patientTelemedMessage" class="message" role="status"></p><div id="patientTelemedSessions"></div>';
 root.append(p);$("patientTelemedRefresh").addEventListener("click",loadPatient);
}
async function loadStaff(){
 if(!clinic()||!user()){say("telemedOpsMessage","Sign in to an active hospital first.",true);return;}
 say("telemedOpsMessage","Loading accepted requests and session records…");
 try{
  const [{data:req,error:reqErr},sessions]=await Promise.all([
   db().from("healthos_patient_appointment_requests").select("id,patient_user_id,requested_at,reason,visit_type,status").eq("clinic_id",clinic()).in("visit_type",["audio","video"]).eq("status","accepted").order("requested_at",{ascending:true}).limit(100),
   rpc("healthos_get_clinic_telemedicine_sessions",{p_clinic_id:clinic()})
  ]);
  if(reqErr)throw reqErr;
  const host=$("telemedAcceptedRequests");host.replaceChildren();
  const existing=new Set((sessions?.sessions||[]).map(s=>s.appointment_request_id));
  const pending=(req||[]).filter(r=>!existing.has(r.id));
  if(!pending.length)host.innerHTML='<p class="telemed-muted">No accepted remote requests are waiting for session creation.</p>';
  pending.forEach(r=>{const card=document.createElement("article");card.className="telemed-card";const title=document.createElement("h4");title.textContent=r.visit_type.toUpperCase()+" consultation · "+new Date(r.requested_at).toLocaleString();const desc=document.createElement("p");desc.textContent=r.reason||"No reason supplied.";const btn=document.createElement("button");btn.className="primary-button";btn.textContent="Create consultation session";btn.addEventListener("click",async()=>{btn.disabled=true;try{const d=await rpc("healthos_create_telemedicine_session",{p_request_id:r.id});say("telemedOpsMessage","Session created. The patient must grant consent in their patient portal before a video room can be issued.");await loadStaff();}catch(e){say("telemedOpsMessage",e.message,true);btn.disabled=false;}});card.append(title,desc,btn);host.append(card);});
  const box=$("telemedClinicSessions");box.replaceChildren();const rows=sessions?.sessions||[];
  if(!rows.length)box.innerHTML='<p class="telemed-muted">No prepared consultation sessions yet.</p>';
  rows.forEach(s=>{const card=document.createElement("article");card.className="telemed-card";const consent=s.consent_status||"not recorded";card.innerHTML='<h4>'+esc(String(s.channel).toUpperCase())+' consultation · '+esc(new Date(s.scheduled_at).toLocaleString())+'</h4><p>Status: <strong>'+esc(s.session_status)+'</strong> · Patient consent: <strong>'+esc(consent)+'</strong></p><p class="telemed-muted">Session reference: '+esc(s.id)+'</p><div class="telemed-actions"></div><div class="telemed-workspace"></div>';
   const actions=card.querySelector(".telemed-actions");
   if(consent==="granted"&&["awaiting_provider","ready","active"].includes(s.session_status)){
    const join=document.createElement("button");join.className="primary-button";join.textContent=s.session_status==="awaiting_provider"?"Prepare private video room":"Join consultation";join.addEventListener("click",async()=>{join.disabled=true;try{const d=await provider({session_id:s.id});await rpc("healthos_mark_telemedicine_session_active",{p_session_id:s.id});window.open(d.join_url,"_blank","noopener");say("telemedOpsMessage","Private consultation access issued. Recording is disabled; the join token expires in one hour.");await loadStaff();}catch(e){say("telemedOpsMessage",e.message,true);join.disabled=false;}});actions.append(join);
   }
   const view=document.createElement("button");view.className="workspace-launch-button";view.textContent="Load clinical workspace";view.addEventListener("click",()=>loadSessionWorkspace(s.id,card.querySelector(".telemed-workspace"),false));actions.append(view);
   if(!["completed","cancelled","expired"].includes(s.session_status)){const complete=document.createElement("button");complete.className="logout-button";complete.textContent="Complete consultation";complete.addEventListener("click",async()=>{if(!confirm("Mark this consultation completed? This closes the session workflow."))return;try{await rpc("healthos_complete_telemedicine_session",{p_session_id:s.id});say("telemedOpsMessage","Consultation marked completed.");await loadStaff();}catch(e){say("telemedOpsMessage",e.message,true);}});actions.append(complete);}
   box.append(card);
  });
  say("telemedOpsMessage",rows.length+" consultation session(s) loaded. Patient consent is required before provider tokens are issued.");
 }catch(e){say("telemedOpsMessage",e.message||"Could not load telemedicine operations.",true);}
}
async function loadSessionWorkspace(sessionId,host,isPatient){
 try{const w=await rpc("healthos_get_telemedicine_workspace",{p_session_id:sessionId});const msgs=w.messages||[],obs=w.observations||[];
 host.innerHTML='<div class="telemed-card"><h4>Remote observations</h4>'+ (obs.length?obs.map(o=>'<p>'+esc(o.metric.replaceAll("_"," ")) +': <strong>'+esc(o.numeric_value)+' '+esc(o.unit)+'</strong> · '+esc(new Date(o.observed_at).toLocaleString())+'</p>').join(""):'<p class="telemed-muted">No remote observations recorded.</p>')+'<h4>Secure follow-up messages</h4><div>'+ (msgs.length?msgs.map(m=>'<p><strong>'+ (m.sender_user_id===user()?.id?"You":"Care team")+':</strong> '+esc(m.message_text)+' <small>'+esc(new Date(m.created_at).toLocaleString())+'</small></p>').join(""):'<p class="telemed-muted">No messages yet.</p>')+'</div><form data-message-form><label>Message to care team<textarea name="message" maxlength="4000" required rows="2" style="width:100%"></textarea></label><button class="primary-button" type="submit">Send secure message</button></form></div>';
 host.querySelector("[data-message-form]").addEventListener("submit",async ev=>{ev.preventDefault();const value=new FormData(ev.target).get("message").trim();if(!value)return;try{await rpc("healthos_send_telemedicine_message",{p_session_id:sessionId,p_message_text:value});await loadSessionWorkspace(sessionId,host,isPatient);}catch(e){alert(e.message);}});
 }catch(e){host.textContent=e.message||"Clinical workspace unavailable.";}
}
async function loadPatient(){
 if(!user()){say("patientTelemedMessage","Sign in to your patient account first.",true);return;}
 say("patientTelemedMessage","Loading your consultation sessions…");
 try{const data=await rpc("healthos_get_my_telemedicine_sessions",{}),rows=data||[];const host=$("patientTelemedSessions");host.replaceChildren();if(!rows.length){host.innerHTML='<p class="telemed-muted">You have no remote consultations yet. Request an audio or video appointment from a HealthOS hospital.</p>';say("patientTelemedMessage","No virtual consultations found.");return;}
  for(const s of rows){const card=document.createElement("article");card.className="telemed-card";card.innerHTML='<h3>'+esc(s.hospital_name||"Hospital")+'</h3><p>'+esc(String(s.channel).toUpperCase())+' · '+esc(new Date(s.scheduled_at).toLocaleString())+'</p><p>Status: <strong>'+esc(s.session_status)+'</strong></p><div class="telemed-actions"></div><div class="telemed-workspace"></div>';
   const actions=card.querySelector(".telemed-actions"),workspace=card.querySelector(".telemed-workspace");
   const w=await rpc("healthos_get_telemedicine_workspace",{p_session_id:s.id});const cons=w.consents||[];const latest=cons[0];const granted=latest?.consent_status==="granted"&&!latest?.revoked_at;
   const consent=document.createElement("button");consent.className=granted?"logout-button":"primary-button";consent.textContent=granted?"Revoke telemedicine consent":"Review & grant consent";consent.addEventListener("click",async()=>{if(granted){if(!confirm("Revoke consent? This will prevent new provider join tokens and remote monitoring entries."))return;}else{if(!confirm("I consent to this remote consultation and to sharing the observations I choose to submit with this hospital care team. I understand I can revoke consent. This does not replace emergency care."))return;}try{await rpc("healthos_patient_telemedicine_consent",{p_session_id:s.id,p_grant:!granted});say("patientTelemedMessage",granted?"Consent revoked.":"Consent recorded.");await loadPatient();}catch(e){say("patientTelemedMessage",e.message,true);}});
   actions.append(consent);
   if(granted&&["ready","active"].includes(s.session_status)){const join=document.createElement("button");join.className="primary-button";join.textContent="Join video consultation";join.addEventListener("click",async()=>{join.disabled=true;try{const d=await provider({session_id:s.id});window.open(d.join_url,"_blank","noopener");}catch(e){say("patientTelemedMessage",e.message,true);join.disabled=false;}});actions.append(join);}
   if(granted&&["ready","active"].includes(s.session_status)){const details=document.createElement("details");details.innerHTML='<summary>Submit home observation</summary><form data-observation-form><label>Measurement<select name="metric"><option value="blood_pressure_systolic">Systolic blood pressure</option><option value="blood_pressure_diastolic">Diastolic blood pressure</option><option value="heart_rate">Heart rate</option><option value="temperature">Temperature</option><option value="oxygen_saturation">Oxygen saturation</option><option value="blood_glucose">Blood glucose</option><option value="weight">Weight</option></select></label><label>Value<input name="value" type="number" step="0.001" required></label><label>Unit<input name="unit" maxlength="20" required placeholder="e.g. mmHg, bpm, °C, %"></label><label>Optional note<textarea name="note" maxlength="1000" rows="2"></textarea></label><button class="primary-button" type="submit">Submit observation</button></form>';details.querySelector("form").addEventListener("submit",async ev=>{ev.preventDefault();const d=new FormData(ev.target);try{await rpc("healthos_submit_remote_observation",{p_session_id:s.id,p_metric:d.get("metric"),p_numeric_value:Number(d.get("value")),p_unit:d.get("unit"),p_patient_note:d.get("note")||null});say("patientTelemedMessage","Observation submitted to your authorised care team. This app does not interpret readings or replace medical advice.");await loadSessionWorkspace(s.id,workspace,true);}catch(e){say("patientTelemedMessage",e.message,true);}});actions.append(details);}
   const load=document.createElement("button");load.className="workspace-launch-button";load.textContent="View messages & observations";load.addEventListener("click",()=>loadSessionWorkspace(s.id,workspace,true));actions.append(load);host.append(card);
  }
  say("patientTelemedMessage",rows.length+" virtual consultation(s) loaded. Consent is managed separately for each visit.");
 }catch(e){say("patientTelemedMessage",e.message||"Could not load patient consultations.",true);}
}
function boot(){addStyles();mountStaff();mountPatient();$("telemedOpsRefresh")?.addEventListener("click",loadStaff);}
document.addEventListener("DOMContentLoaded",boot);
const observer=new MutationObserver(()=>{addStyles();mountStaff();mountPatient();});observer.observe(document.documentElement,{childList:true,subtree:true});
window.HealthOSTelemedicine={refreshHospital:loadStaff,refreshPatient:loadPatient};
})();