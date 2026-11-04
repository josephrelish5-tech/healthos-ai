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
 function statusOptions(value){return ["pending","in_review","passed","failed","unable_to_verify","expired"].map(x=>'<option value="'+x+'" '+(value===x?"selected":"")+'>'+x.replaceAll("_"," ")+'</option>').join("");}
 function render(data){
  const apps=data.applications||[],checks=data.checks||[],docs=data.documents||[];
  $("hospitalReviewQueueCount").textContent=apps.length+" applications";
  $("hospitalRegistrationReviewRows").innerHTML=apps.map(a=>{
   const cs=checks.filter(c=>c.application_id===a.id),ds=docs.filter(d=>d.application_id===a.id);
   const passed=cs.filter(c=>c.check_status==="passed").length;
   return '<article class="panel hospital-review-card" data-app="'+esc(a.id)+'"><div class="panel-heading"><div><p class="eyebrow">'+esc(a.status.replaceAll("_"," ").toUpperCase())+'</p><h3>'+esc(a.official_legal_name||a.registered_entity_name||"Hospital application")+'</h3><p class="muted">'+esc([a.city,a.state,a.local_government_area].filter(Boolean).join(", "))+' · '+passed+'/9 checks passed</p></div><span class="stat-note">Submitted: '+esc(a.submitted_at||"Not recorded")+'</span></div>
   <div class="form-grid"><p><b>Registered entity:</b> '+esc(a.registered_entity_name)+'</p><p><b>Category:</b> '+esc(a.hospital_category)+'</p><p><b>Ownership:</b> '+esc(a.ownership_type)+'</p><p><b>Registration no.:</b> '+esc(a.registration_number)+'</p><p><b>Licence:</b> '+esc(a.licence_number)+' · Expires '+esc(a.licence_expiry_date)+'</p><p><b>Licensing authority:</b> '+esc(a.licensing_authority)+'</p><p><b>Address:</b> '+esc(a.full_address)+'</p><p><b>Contact:</b> '+esc(a.official_phone)+' / '+esc(a.official_email)+'</p><p><b>GPS:</b> '+esc(a.latitude)+', '+esc(a.longitude)+'</p><p><b>Website:</b> '+esc(a.website_url)+'</p></div>
   <h4>Submitted documents</h4><ul>'+ (ds.map(d=>'<li>'+esc(d.document_type.replaceAll("_"," "))+' — '+esc(d.original_file_name)+' ('+esc(d.mime_type)+') '+(d.signed_url?'<a href="'+esc(d.signed_url)+'" target="_blank" rel="noopener">Open securely (5 minutes)</a>':'<span class="muted">Preview unavailable</span>')+'</li>').join("")||"<li>No documents found.</li>")+'</ul>
   <h4>Nine-point identity verification</h4><div class="hospital-review-checks">'+cs.map(c=>'<form class="hospital-review-check auth-form" data-check="'+esc(c.check_type)+'"><h4>'+esc(checkNames[c.check_type]||c.check_type)+'</h4><p class="muted">Current status: '+esc(c.check_status.replaceAll("_"," "))+'</p><label>Review status<select name="status">'+statusOptions(c.check_status)+'</select></label><label>Evidence reference<input name="evidence_reference" maxlength="1000" value="'+esc(c.evidence_reference)+'" placeholder="Licence number, registry result or evidence reference"></label><label>Evidence source<input name="evidence_source" maxlength="500" value="'+esc(c.evidence_source)+'" placeholder="Issuing authority / official source"></label><label>Valid until<input name="valid_until" type="date" value="'+esc(c.valid_until)+'"></label><label>Reviewer notes<textarea name="reviewer_notes" rows="2" maxlength="2000" placeholder="Required when completing a check">'+esc(c.reviewer_notes)+'</textarea></label><button class="secondary-button" type="submit">Save check</button></form>').join("")+'</div>
   <div class="panel"><h4>Final application decision</h4><label>Decision reason<textarea class="hospital-review-decision-reason" rows="2" maxlength="2000" placeholder="Explain the decision; required."></textarea></label><div class="button-row"><button type="button" class="primary-button" data-final="approved">Approve & activate network listing</button><button type="button" class="secondary-button" data-final="resubmission_required">Request resubmission</button><button type="button" class="logout-button" data-final="rejected">Reject application</button></div><p class="muted">Approval is blocked by the database unless all nine checks are passed and current.</p></div></article>';
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
   const btn=e.target.closest("[data-final]");if(!btn)return;const card=btn.closest("[data-app]"),reason=card.querySelector(".hospital-review-decision-reason").value.trim();if(!reason){$("hospitalReviewMessage").textContent="Enter a decision reason first.";return;}
   const decision=btn.dataset.final;if(!confirm("Confirm hospital application decision: "+decision.replaceAll("_"," ")+"?"))return;
   try{const result=await request("POST",{action:"decide_hospital_application",application_id:card.dataset.app,decision,reason});$("hospitalReviewMessage").textContent="Decision recorded. Network activation: "+(result.result?.network_activated?"active":"not activated") ;await load();}catch(x){$("hospitalReviewMessage").textContent=x.message;}
  });
  client.auth.onAuthStateChange((event,session)=>{if(!session){$("hospitalRegistrationReview").hidden=true;$("openHospitalRegistrationReview").hidden=true;}});
 });
})();