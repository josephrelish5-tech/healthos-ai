/* HealthOS AI — encrypted offline pharmacy action queue.
 * Offline entries are evidence/intents only. Sync never changes inventory or dispenses stock.
 */
(function () {
 "use strict";
 const $ = id => document.getElementById(id);
 const DB = "healthos_pharmacy_offline_v1", STORE = "queue", KEY = "encrypted_actions";
 let actions = [];
 const owner = () => (typeof currentUser !== "undefined" && currentUser && typeof currentClinic !== "undefined" && currentClinic)
   ? { user: currentUser.id, clinic: currentClinic.id } : null;
 const say = (message, error=false) => { const el=$("pharmacyOfflineMessage"); if(el){el.textContent=message;el.className="message"+(error?" error":" success");} };
 function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async function readRecord(){const d=await openDb();return new Promise((resolve,reject)=>{const r=d.transaction(STORE).objectStore(STORE).get(KEY);r.onsuccess=()=>{d.close();resolve(r.result||null);};r.onerror=()=>{d.close();reject(r.error);};});}
 async function writeRecord(v){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(v,KEY);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(t.error);};});}
 async function eraseRecord(){const d=await openDb();return new Promise((resolve,reject)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(KEY);t.oncomplete=()=>{d.close();resolve();};t.onerror=()=>{d.close();reject(t.error);};});}
 async function persist(){
   const o=owner(); if(!o) throw Error("Sign in to the clinic workspace before using the pharmacy queue.");
   const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
   const iv=crypto.getRandomValues(new Uint8Array(12));
   const plain=new TextEncoder().encode(JSON.stringify({owner:o,actions}));
   const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
   await writeRecord({key,iv:[...iv],ciphertext});
 }
 async function unlock(){
   const o=owner(); if(!o) throw Error("Sign in to the same clinic account that created this queue.");
   const rec=await readRecord(); if(!rec) throw Error("No local pharmacy queue exists on this device.");
   const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(rec.iv)},rec.key,rec.ciphertext);
   const data=JSON.parse(new TextDecoder().decode(plain));
   if(data.owner.user!==o.user||data.owner.clinic!==o.clinic){await eraseRecord();actions=[];render();throw Error("This queue belongs to another account or clinic and has been erased.");}
   actions=Array.isArray(data.actions)?data.actions:[];render();return actions;
 }
 function cell(row,value){const td=document.createElement("td");td.textContent=String(value??"—");row.appendChild(td);}
 function render(){
   const body=$("pharmacyOfflineRows"); if(!body)return;
   body.replaceChildren(); $("pharmacyOfflineCount").textContent=String(actions.filter(a=>!a.serverId).length);
   if(!actions.length){const tr=body.insertRow(),td=tr.insertCell();td.colSpan=6;td.textContent="No local actions.";return;}
   actions.forEach(a=>{const tr=body.insertRow();cell(tr,new Date(a.capturedAt).toLocaleString());cell(tr,a.type);cell(tr,a.medicine+" / "+(a.batch||"—"));cell(tr,a.quantity);cell(tr,a.reason);cell(tr,a.serverId?"Uploaded — pending review":"Local only");});
 }
 async function saveAction(event){
   event.preventDefault();
   try{
     const o=owner();if(!o)throw Error("Sign in to the clinic workspace first.");
     const medicine=$("pharmacyOfflineMedicine").value.trim(),quantity=Number($("pharmacyOfflineQuantity").value),reason=$("pharmacyOfflineReason").value.trim();
     if(medicine.length<2||!Number.isSafeInteger(quantity)||quantity<1||!reason)throw Error("Enter a medicine, whole-number quantity and reason/reference.");
     if(!actions.length){try{await unlock();}catch(e){if(!/No local pharmacy queue/.test(e.message))throw e;}}
     const action={id:crypto.randomUUID(),type:$("pharmacyOfflineType").value,medicine,batch:$("pharmacyOfflineBatch").value.trim(),quantity,expiry:$("pharmacyOfflineExpiry").value||null,reason,capturedAt:new Date().toISOString(),serverId:null};
     actions.push(action);await persist();render();$("pharmacyOfflineForm").reset();say("Action encrypted and saved locally. It has not changed stock or been sent to the server.");
   }catch(e){say(e.message||"Could not save the local action.",true);}
 }
 async function sync(){
   const o=owner();if(!o)throw Error("Sign in to the clinic workspace first.");
   if(!navigator.onLine)throw Error("Reconnect to the internet before uploading the queue.");
   if(!actions.length)await unlock();
   const pending=actions.filter(a=>!a.serverId);
   if(!pending.length){say("There are no local actions waiting to upload.");return;}
   const rows=pending.map(a=>({clinic_id:o.clinic,actor_id:o.user,idempotency_key:a.id,operation_type:a.type,payload:{medicine:a.medicine,batch:a.batch,quantity:a.quantity,expiry_date:a.expiry,reason_or_reference:a.reason},captured_at:a.capturedAt,status:"pending_review"}));
   const {data,error}=await supabaseClient.from("pharmacy_offline_operation_queue").insert(rows).select("idempotency_key,id");
   if(error)throw error;
   const ids=new Map((data||[]).map(r=>[r.idempotency_key,r.id]));
   if(ids.size!==pending.length)throw Error("The server did not confirm every queued action. Keep the local queue and contact an administrator before retrying.");
   actions.forEach(a=>{if(ids.has(a.id))a.serverId=ids.get(a.id);});
   await persist();render();
   $("pharmacyOfflinePending").textContent=String(actions.filter(a=>a.serverId).length);
   say(pending.length+" action(s) uploaded as pending review. No inventory quantity, billing or dispensing record was changed.");
 }
 $("pharmacyOfflineForm")?.addEventListener("submit",saveAction);
 $("pharmacyOfflineUnlock")?.addEventListener("click",async()=>{try{await unlock();say("Encrypted pharmacy queue loaded for this signed-in account.");}catch(e){say(e.message,true);}});
 $("pharmacyOfflineSync")?.addEventListener("click",async()=>{const b=$("pharmacyOfflineSync");b.disabled=true;try{await sync();}catch(e){say("Upload failed: "+(e.message||"Unknown error")+". Local actions have been retained.",true);}finally{b.disabled=false;}});
 $("pharmacyOfflineErase")?.addEventListener("click",async()=>{if(!confirm("Permanently erase this device’s encrypted pharmacy queue? Uploaded server review records will not be deleted."))return;try{await eraseRecord();actions=[];render();say("Local encrypted queue erased. Server records remain unchanged.");}catch(e){say(e.message,true);}});
 function network(){const el=$("pharmacyOfflineConnection");if(el)el.textContent=navigator.onLine?"Online":"Offline — local queue only";}
 window.addEventListener("online",network);window.addEventListener("offline",network);network();
 if(!window.crypto?.subtle||!window.indexedDB){say("Secure offline storage is not supported in this browser.",true);}
 document.addEventListener("click",e=>{if(e.target.closest('[href="#pharmacy"],[data-section="pharmacy"]'))setTimeout(()=>{if(actions.length)render();},150);});
 window.addEventListener("healthos:signout",()=>{actions=[];render();});
})();