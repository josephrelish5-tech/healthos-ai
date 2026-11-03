/* HealthOS AI — encrypted offline EHR cache and clinician-reviewed draft queue.
   This is a limited browser-side workflow, not a replacement for live records. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id), DB="healthos_offline_ehr_v1", STORE="vault", KEY="ehr_bundle", TTL=8*60*60*1000;
 let bundle=null;
 const owner=()=>currentUser&&currentClinic?{user:currentUser.id,clinic:currentClinic.id}:null;
 const say=(m,e=false)=>{const el=$("offlineEhrMessage");if(el){el.textContent=m;el.className="message"+(e?" error":" success");}};
 function db(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
 async function get(){const d=await db();return new Promise((ok,no)=>{const r=d.transaction(STORE).objectStore(STORE).get(KEY);r.onsuccess=()=>{d.close();ok(r.result||null);};r.onerror=()=>{d.close();no(r.error);};});}
 async function put(v){const d=await db();return new Promise((ok,no)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(v,KEY);t.oncomplete=()=>{d.close();ok();};t.onerror=()=>{d.close();no(t.error);};});}
 async function erase(){const d=await db();return new Promise((ok,no)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(KEY);t.oncomplete=()=>{d.close();ok();};t.onerror=()=>{d.close();no(t.error);};});}
 async function persist(){
  const o=owner();if(!o)throw Error("Sign in to the clinic workspace first.");
  const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]),iv=crypto.getRandomValues(new Uint8Array(12));
  const payload={owner:o,expiresAt:Date.now()+TTL,bundle};
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(payload)));
  await put({key,iv:[...iv],ciphertext});
 }
 async function unlock(){
  const o=owner();if(!o)throw Error("Sign in to the same clinic account that cached this record.");
  const rec=await get();if(!rec)throw Error("No encrypted offline record is stored on this device.");
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(rec.iv)},rec.key,rec.ciphertext),data=JSON.parse(new TextDecoder().decode(plain));
  if(data.owner.user!==o.user||data.owner.clinic!==o.clinic||data.expiresAt<Date.now()){await erase();bundle=null;throw Error("Cached record expired or belongs to another account. It has been erased.");}
  bundle=data.bundle;render();return bundle;
 }
 function render(){
  $("offlineEhrCacheState").textContent=bundle?"Encrypted record unlocked":"Not cached";
  $("offlineEhrDraftCount").textContent=String(bundle?.drafts?.length||0);
  const preview=$("offlineEhrRecordPreview"),body=$("offlineEhrDraftBody");preview.replaceChildren();body.replaceChildren();
  if(!bundle){preview.textContent="No cached record unlocked.";body.innerHTML="<tr><td colspan='4'>No local drafts.</td></tr>";return;}
  const p=bundle.patient,e=bundle.encounter;
  const h=document.createElement("h4");h.textContent="Cached patient: "+p.patient_number+" — "+p.first_name+" "+p.last_name;preview.appendChild(h);
  const details=document.createElement("p");details.textContent="Encounter "+e.encounter_number+" · "+e.encounter_type+" · "+e.status+" · Cached "+new Date(bundle.cachedAt).toLocaleString();preview.appendChild(details);
  [["Recent clinical notes",bundle.notes],["Recorded observations",bundle.vitals],["Recorded allergies",bundle.allergies]].forEach(([title,rows])=>{
   const hd=document.createElement("strong");hd.textContent=title;preview.appendChild(hd);
   const ul=document.createElement("ul");(rows||[]).forEach(row=>{const li=document.createElement("li");li.textContent=Object.entries(row).map(([k,v])=>k+": "+(v??"—")).join(" · ");ul.appendChild(li);});if(!rows?.length){const li=document.createElement("li");li.textContent="No entries in cached sample.";ul.appendChild(li);}preview.appendChild(ul);
  });
  (bundle.drafts||[]).forEach(d=>{const tr=body.insertRow();[new Date(d.capturedAt).toLocaleString(),d.noteType,d.text,d.status].forEach(v=>{const td=tr.insertCell();td.textContent=String(v);});});
  if(!bundle.drafts?.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=4;td.textContent="No local drafts.";}
  $("offlineEhrDraftCount").textContent=String(bundle.drafts?.length||0);
 }
 async function cacheRecord(){
  if(!navigator.onLine)throw Error("Connect to the internet before caching a patient record.");
  const clinic=currentClinic?.id,user=currentUser?.id;
  if(!clinic||!user)throw Error("Sign in to an authorised clinic workspace first.");
  const patientId=$("clinicalPatientSelect")?.value,encounterId=$("clinicalVitalsEncounter")?.value;
  if(!patientId||!encounterId)throw Error("Select the patient and an open encounter first.");
  const [pr,er]=await Promise.all([
   supabaseClient.from("patients").select("id,clinic_id,patient_number,first_name,last_name,date_of_birth,sex").eq("id",patientId).eq("clinic_id",clinic).maybeSingle(),
   supabaseClient.from("clinical_encounters").select("id,clinic_id,patient_id,encounter_number,encounter_type,status,clinician_id,started_at").eq("id",encounterId).eq("clinic_id",clinic).eq("patient_id",patientId).eq("clinician_id",user).maybeSingle()
  ]);
  if(pr.error)throw pr.error;if(er.error)throw er.error;
  if(!pr.data||!er.data||!["open","in_progress"].includes(er.data.status))throw Error("Patient or clinician-assigned open encounter could not be verified.");
  const [n,v,a]=await Promise.all([
   supabaseClient.from("clinical_notes").select("note_type,note_text,status,created_at").eq("clinic_id",clinic).eq("encounter_id",encounterId).order("created_at",{ascending:false}).limit(20),
   supabaseClient.from("patient_vitals").select("temperature_c,systolic_bp,diastolic_bp,pulse_bpm,respiratory_rate,oxygen_saturation,weight_kg,recorded_at").eq("clinic_id",clinic).eq("patient_id",patientId).order("recorded_at",{ascending:false}).limit(20),
   supabaseClient.from("patient_allergies").select("allergen,reaction,severity,status").eq("clinic_id",clinic).eq("patient_id",patientId).limit(50)
  ]);
  for(const x of [n,v,a])if(x.error)throw x.error;
  bundle={patient:pr.data,encounter:er.data,notes:n.data||[],vitals:v.data||[],allergies:a.data||[],drafts:bundle?.drafts||[],cachedAt:Date.now()};
  await persist();render();say("Selected patient summary encrypted and cached on this device for up to 8 hours.");
 }
 async function saveDraft(){
  const text=$("offlineEhrNoteText").value.trim(),type=$("offlineEhrNoteType").value;
  if(!text)throw Error("Enter note text before saving.");
  if(!bundle)await unlock();
  if(text.length>12000)throw Error("Draft is too long.");
  bundle.drafts=bundle.drafts||[];bundle.drafts.push({id:crypto.randomUUID(),noteType:type,text,capturedAt:Date.now(),status:"local draft"});
  await persist();$("offlineEhrNoteText").value="";render();say("Draft encrypted locally. It has not been added to the medical record.");
 }
 async function syncDrafts(){
  if(!navigator.onLine)throw Error("Reconnect before reviewing and saving drafts.");
  if(!bundle)await unlock();
  const pending=bundle.drafts.filter(d=>d.status!=="saved");
  if(!pending.length){say("There are no unsaved drafts.");return;}
  const confirmed=confirm("Review "+pending.length+" draft(s) in the table. Save them as unsigned clinical notes for the cached encounter? This appends notes and never overwrites existing records.");
  if(!confirmed)return;
  const {data:enc,error}=await supabaseClient.from("clinical_encounters").select("id,patient_id,status,clinician_id").eq("id",bundle.encounter.id).eq("clinic_id",currentClinic.id).maybeSingle();
  if(error)throw error;
  if(!enc||enc.patient_id!==bundle.patient.id||enc.clinician_id!==currentUser.id||!["open","in_progress"].includes(enc.status)){pending.forEach(d=>d.status="conflict: encounter changed, closed or access revoked");await persist();render();say("Conflict detected. Drafts remain encrypted locally; no clinical note was saved.",true);return;}
  let saved=0,failed=0;
  for(const d of pending){
   const {error:writeError}=await supabaseClient.from("clinical_notes").insert({id:d.id,clinic_id:currentClinic.id,encounter_id:enc.id,note_type:d.noteType,note_text:d.text,status:"draft",author_id:currentUser.id});
   if(!writeError){d.status="saved as unsigned draft";saved++;}
   else if(writeError.code==="23505"){const {data:existing}=await supabaseClient.from("clinical_notes").select("id,encounter_id,author_id,status").eq("id",d.id).eq("clinic_id",currentClinic.id).maybeSingle();if(existing&&existing.encounter_id===enc.id&&existing.author_id===currentUser.id&&existing.status==="draft"){d.status="saved as unsigned draft";saved++;}else{d.status="conflict";failed++;}}
   else{d.status="sync error: "+writeError.message;failed++;}
  }
  await persist();render();say("Sync result: "+saved+" unsigned draft(s) saved; "+failed+" conflict/error(s). Review them in the live clinical record.");
  if(window.loadHealthOSClinicalRecords)await window.loadHealthOSClinicalRecords();
 }
 $("offlineEhrCacheButton")?.addEventListener("click",async()=>{try{await cacheRecord();}catch(e){say(e.message,true);}});
 $("offlineEhrLoadButton")?.addEventListener("click",async()=>{try{await unlock();say("Encrypted patient record unlocked for this signed-in account.");}catch(e){say(e.message,true);}});
 $("offlineEhrSaveDraft")?.addEventListener("click",async()=>{try{await saveDraft();}catch(e){say(e.message,true);}});
 $("offlineEhrReviewSync")?.addEventListener("click",async()=>{try{await syncDrafts();}catch(e){say("Draft review/sync failed: "+e.message,true);}});
 $("offlineEhrErase")?.addEventListener("click",async()=>{if(!confirm("Erase this device’s cached patient record and all local drafts? This cannot be undone."))return;try{await erase();bundle=null;render();say("Encrypted offline patient cache and local drafts erased.");}catch(e){say(e.message,true);}});
 function network(){ $("offlineEhrConnection").textContent=navigator.onLine?"Online":"Offline — local cache only"; }
 window.addEventListener("online",network);window.addEventListener("offline",network);network();
 document.querySelectorAll(".sidebar .nav-item").forEach(el=>el.addEventListener("click",()=>{if((el.getAttribute("href")||"").includes("clinicalRecords")){const rec=get();rec.then(async r=>{if(r){try{await unlock();}catch(_){}}}).catch(()=>{});}}));
 window.addEventListener("healthos:signout",()=>{bundle=null;render();});
 if(!crypto?.subtle||!indexedDB)say("Secure offline storage is not supported in this browser.",true);
})();
