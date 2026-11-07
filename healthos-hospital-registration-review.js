// HealthOS AI — restricted hospital registration review console
(() => {
 const URL="https://berfmuhqfuwcgpnqxrtm.supabase.co";
 const KEY="sb_publishable_UIhbdxfxl8jsU9KnIE93pg_HTEsU39C";
 const ENDPOINT=URL+"/functions/v1/healthos-hospital-directory-admin";
 let client, loaded=false;
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const checkNames={facility_licence:"Facility licence",business_registration:"Business registration",owner_identity:"Owner identity",facility_address:"Facility address",gps_location:"GPS location",facility_contact:"Facility contact",operating_status:"Operating status",duplicate_screening:"Duplicate screening",professional_oversight:"Professional oversight"};
 async function request(method="GET",body){
  const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token)throw Error("Sign in with an authorised platform administrator account.");
  const res=await fetch(ENDPOINT+(method==="GET"?"?view=registration_applications":""),{method,headers:{Authorization:"Bearer "+session.access_token,apikey:KEY,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({error:"Invalid server response"}));if(!res.ok)throw Error(data.error||"Request failed");return data;
 }
 function statusOptions(value){return ["in_review","passed","failed","unable_to_verify","expired"].map(x=>'<option value="'+x+'" '+(value===x?"selected":"")+'>'+x.replaceAll("_"," ")+'</option>').join("");}
 function render(data){
  const apps=data.applications||[],checks=data.checks||[],docs=data.documents||[],events=data.events||[],flags=data.risk_flags||[],detectionResults=data.detection_results||[];
  $("hospitalReviewQueueCount").textContent=apps.length+" applications";
  $("hospitalRegistrationReviewRows").innerHTML=apps.map(a=>{
   const cs=checks.filter(c=>c.application_id===a.id),ds=docs.filter(d=>d.application_id===a.id);
   const appFlags=flags.filter(flag=>flag.application_id===a.id);
   const detection=detectionResults.find(item=>item.application_id===a.id);
   const passed=cs.filter(c=>c.check_status==="passed").length;
   const screeningError=[detection?.duplicate_error,detection?.document_error].filter(Boolean).join(" · ");
   const flagHtml=appFlags.map(flag=>`
    <article class="panel hospital-risk-flag">
     <p><b>${esc(String(flag.severity||"").toUpperCase())} · ${esc(String(flag.flag_code||"").replaceAll("_"," "))}</b> · ${esc(String(flag.flag_status||"").replaceAll("_"," "))}</p>
     <h4>${esc(flag.title)}</h4><p>${esc(flag.description)}</p>
     <details><summary>View screening evidence</summary><pre>${esc(JSON.stringify(flag.evidence||{},null,2))}</pre></details>
     <label>Reviewer notes<textarea class="hospital-risk-notes" rows="2" maxlength="2000" placeholder="Explain how this risk flag was reviewed."></textarea></label>
     <div class="button-row">
      <button type="button" class="secondary-button" data-risk-status="under_review" data-flag-id="${esc(flag.id)}">Mark under review</button>
      <button type="button" class="secondary-button" data-risk-status="resolved" data-flag-id="${esc(flag.id)}">Resolve</button>
      <button type="button" class="secondary-button" data-risk-status="false_positive" data-flag-id="${esc(flag.id)}">False positive</button>
      <button type="button" class="secondary-button" data-risk-status="accepted_risk" data-flag-id="${esc(flag.id)}">Accept documented risk</button>
     </div>
    </article>`).join("");
   return `
    <article class="panel hospital-review-card" data-app="${esc(a.id)}">
     <div class="panel-heading"><div><p class="eyebrow">${esc(String(a.status||"").replaceAll("_"," ").toUpperCase())}</p><h3>${esc(a.official_legal_name||a.registered_entity_name||"Hospital application")}</h3><p class="muted">${esc([a.city,a.state,a.local_government_area].filter(Boolean).join(", "))} · ${passed}/9 checks passed</p></div><span class="stat-note">Submitted: ${esc(a.submitted_at||"Not recorded")}</span></div>
     <div class="form-grid">
      <p><b>Registered entity:</b> ${esc(a.registered_entity_name)}</p><p><b>Category:</b> ${esc(a.hospital_category)}</p><p><b>Ownership:</b> ${esc(a.ownership_type)}</p><p><b>Registration no.:</b> ${esc(a.registration_number)}</p><p><b>Licence:</b> ${esc(a.licence_number)} · Expires ${esc(a.licence_expiry_date)}</p><p><b>Licensing authority:</b> ${esc(a.licensing_authority)}</p><p><b>Address:</b> ${esc(a.full_address)}</p><p><b>Contact:</b> ${esc(a.official_phone)} / ${esc(a.official_email)}</p><p><b>GPS:</b> ${esc(a.latitude)}, ${esc(a.longitude)}</p><p><b>Website:</b> ${esc(a.website_url)}</p>
     </div>
     <h4>Submitted documents</h4><ul>${ds.map(d=>`<li>${esc(String(d.document_type||"").replaceAll("_"," "))} — ${esc(d.original_file_name)} (${esc(d.mime_type)}) ${d.signed_url?'<a href="'+esc(d.signed_url)+'" target="_blank" rel="noopener noreferrer">Open securely (5 minutes)</a>':'<span class="muted">Preview unavailable</span>'}</li>`).join("")||"<li>No documents found.</li>"}</ul>
     <h4>Automated screening and risk flags</h4>
     <p class="muted">Duplicate identity and document metadata screening runs when this queue is loaded. A flag is a review indicator, not proof of fraud or invalidity. ${screeningError?"Screening warning: "+esc(screeningError):"Screening completed without a reported execution error."}</p>
     ${flagHtml||'<p class="muted">No open automated risk flags for this application.</p>'}
     <h4>Evidence and review history</h4><ol class="hospital-review-history">${events.filter(ev=>ev.application_id===a.id).map(ev=>`<li><b>${esc(String(ev.event_type||"").replaceAll("_"," "))}</b> · ${esc(ev.created_at)} · ${esc(JSON.stringify(ev.event_details||{}))}</li>`).join("")||"<li>No review history recorded yet.</li>"}</ol>
     <h4>Nine-point identity verification</h4><div class="hospital-review-checks">${cs.map(c=>`
      <form class="hospital-review-check auth-form" data-check="${esc(c.check_type)}">
       <h4>${esc(checkNames[c.check_type]||c.check_type)}</h4><p class="muted">Current status: ${esc(String(c.check_status||"").replaceAll("_"," "))}</p>
       <label>Review status<select name="status">${statusOptions(c.check_status)}</select></label>
       <label>Evidence reference<input name="evidence_reference" maxlength="1000" value="${esc(c.evidence_reference)}" placeholder="Licence number, registry result or evidence reference"></label>
       <label>Evidence source<input name="evidence_source" maxlength="500" value="${esc(c.evidence_source)}" placeholder="Issuing authority / official source"></label>
       <label>Valid until<input name="valid_until" type="date" value="${esc(c.valid_until)}"></label>
       <label>Reviewer notes<textarea name="reviewer_notes" rows="2" maxlength="2000" placeholder="Required when completing a check">${esc(c.reviewer_notes)}</textarea></label>
       <button class="secondary-button" type="submit">Save check</button>
      </form>`).join("")}</div>
     <div class="panel"><h4>Final application decision</h4><label>Decision reason<textarea class="hospital-review-decision-reason" rows="2" maxlength="2000" placeholder="Explain the decision; required."></textarea></label><div class="button-row"><button type="button" class="primary-button" data-final="approved">Approve &amp; activate network listing</button><button type="button" class="secondary-button" data-final="resubmission_required">Request resubmission</button><button type="button" class="logout-button" data-final="rejected">Reject application</button></div><p class="muted">Approval is blocked by the database unless all nine checks are passed and current.</p></div>
    </article>`;
  }).join("")||'<p class="muted">No hospital applications are currently awaiting review.</p>';
 }
 async function load(){try{$("hospitalReviewMessage").textContent="Loading secure hospital applications…";const d=await request();render(d);loaded=true;$("hospitalReviewMessage").textContent="Authorised review workspace loaded. "+(d.applications||[]).length+" applications found.";}catch(e){$("hospitalReviewMessage").textContent=e.message;}}
 document.addEventListener("DOMContentLoaded",()=>{
  if(!$("hospitalRegistrationReviewRows"))return;
  client=window.supabase.createClient(URL,KEY);
  $("refreshHospitalReview").addEventListener("click",load);
  $("openHospitalRegistrationReview").addEventListener("click",()=>{$("hospitalRegistrationReview").hidden=false;$("hospitalRegistrationReview").scrollIntoView({behavior:"smooth"});load();});
  $("closeHospitalRegistrationReview").addEventListener("click",()=>{$("hospitalRegistrationReview").hidden=true;});
  $("hospitalRegistrationReviewRows").addEventListener("submit",async e=>{
   const form=e.target.closest(".hospital-review-check");if(!form)return;e.preventDefault();
   try{const card=form.closest("[data-app]"),fd=new FormData(form);const body={action:"review_identity_check",application_id:card.dataset.app,check_type:form.dataset.check};for(const k of ["status","evidence_reference","evidence_source","valid_until","reviewer_notes"])body[k]=fd.get(k)||null;await request("POST",body);$("hospitalReviewMessage").textContent="Verification check saved and audit event recorded.";await load();}catch(x){$("hospitalReviewMessage").textContent=x.message;}
  });
  $("hospitalRegistrationReviewRows").addEventListener("click",async e=>{
   const riskButton=e.target.closest("[data-risk-status][data-flag-id]");
   if(riskButton){
    const card=riskButton.closest("[data-app]"),notes=card.querySelector(".hospital-risk-notes")?.value.trim()||"";
    if(notes.length<5){$("hospitalReviewMessage").textContent="Enter at least five characters of reviewer notes for this risk-flag decision.";return;}
    const status=riskButton.dataset.riskStatus;
    if(!confirm("Record risk-flag outcome: "+status.replaceAll("_"," ")+"?"))return;
    riskButton.disabled=true;
    try{await request("POST",{action:"review_risk_flag",flag_id:riskButton.dataset.flagId,status,reviewer_notes:notes,resolution_evidence:{review_context:"platform_hospital_verification_review"}});$("hospitalReviewMessage").textContent="Risk flag review recorded and audit event saved.";await load();}
    catch(x){$("hospitalReviewMessage").textContent=x.message;riskButton.disabled=false;}
    return;
   }
   const btn=e.target.closest("[data-final]");if(!btn)return;const card=btn.closest("[data-app]"),reason=card.querySelector(".hospital-review-decision-reason").value.trim();if(!reason){$("hospitalReviewMessage").textContent="Enter a decision reason first.";return;}
   const decision=btn.dataset.final;if(!confirm("Confirm hospital application decision: "+decision.replaceAll("_"," ")+"?"))return;
   try{const result=await request("POST",{action:"decide_hospital_application",application_id:card.dataset.app,decision,reason});$("hospitalReviewMessage").textContent="Decision recorded. Network activation: "+(result.result?.network_activated?"active":"not activated") ;await load();}catch(x){$("hospitalReviewMessage").textContent=x.message;}
  });
  client.auth.onAuthStateChange((event,session)=>{if(!session){$("hospitalRegistrationReview").hidden=true;$("openHospitalRegistrationReview").hidden=true;}else{request().then(()=>{$("openHospitalRegistrationReview").hidden=false;}).catch(()=>{$("openHospitalRegistrationReview").hidden=true;});}});
  client.auth.getSession().then(({data})=>{if(data.session)request().then(()=>{$("openHospitalRegistrationReview").hidden=false;}).catch(()=>{$("openHospitalRegistrationReview").hidden=true;});});
 });
})();