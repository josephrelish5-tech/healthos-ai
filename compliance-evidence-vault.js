/* HealthOS AI — private compliance evidence vault and documentation pack. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id),form=$("complianceEvidenceForm"),uploadBtn=$("complianceEvidenceUpload"),message=$("complianceEvidenceMessage"),rows=$("complianceEvidenceRows"),select=$("evidenceComplianceReference");
 if(!form)return;
 const bucket="hospital-compliance-evidence",maxBytes=15*1024*1024;
 const allowed=new Set(["application/pdf","image/png","image/jpeg","text/plain","text/csv","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
 const say=(el,text,error=false)=>{el.textContent=text;el.className="message"+(error?" error":" success");};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const client=()=>{if(typeof supabaseClient==="undefined"||typeof currentUser==="undefined"||!currentUser||typeof currentClinic==="undefined"||!currentClinic)throw Error("Sign in to an authorised clinic workspace first.");return supabaseClient;};
 async function loadReferences(){
  const db=client(),{data,error}=await db.from("hospital_compliance_register").select("record_reference,requirement_title").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(500);
  if(error)throw error;
  select.replaceChildren();const first=document.createElement("option");first.value="";first.textContent=data.length?"Select a compliance record":"No compliance records found";select.append(first);
  (data||[]).forEach(r=>{const o=document.createElement("option");o.value=r.record_reference;o.textContent=r.record_reference+" — "+r.requirement_title;select.append(o);});
 }
 async function loadEvidence(){
  const db=client(),{data,error}=await db.from("hospital_compliance_evidence").select("id,compliance_reference,object_path,original_file_name,mime_type,file_size_bytes,evidence_caption,created_at").eq("clinic_id",currentClinic.id).order("created_at",{ascending:false}).limit(500);
  if(error)throw error;
  rows.replaceChildren();
  if(!data.length){const tr=rows.insertRow(),td=tr.insertCell();td.colSpan=5;td.textContent="No evidence files uploaded yet.";return;}
  for(const item of data){
   const tr=rows.insertRow();
   [item.original_file_name,item.compliance_reference,item.evidence_caption||"—",new Date(item.created_at).toLocaleString()].forEach(v=>{const td=tr.insertCell();td.textContent=v;});
   const action=tr.insertCell(),btn=document.createElement("button");btn.type="button";btn.className="primary-button";btn.textContent="Open securely";
   btn.addEventListener("click",async()=>{btn.disabled=true;try{const {data,error}=await db.storage.from(bucket).createSignedUrl(item.object_path,60);if(error)throw error;window.open(data.signedUrl,"_blank","noopener");}catch(e){say(message,"Could not create a secure download link: "+e.message,true);}finally{btn.disabled=false;}});
   action.append(btn);
  }
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();uploadBtn.disabled=true;
  try{
   if(!navigator.onLine)throw Error("Evidence upload requires an internet connection.");
   const db=client(),file=$("complianceEvidenceFile").files[0],reference=select.value;
   if(!file||!reference)throw Error("Select a compliance register record and an evidence file.");
   if(file.size<1||file.size>maxBytes)throw Error("File must be between 1 byte and 15 MB.");
   if(!allowed.has(file.type))throw Error("This file type is not permitted. Use PDF, PNG, JPEG, TXT, CSV, DOCX or XLSX.");
   const id=crypto.randomUUID(),safeName=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120)||"evidence";
   const path=currentClinic.id+"/"+id+"/"+safeName;
   const {error:uploadError}=await db.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const {error:metaError}=await db.from("hospital_compliance_evidence").insert({clinic_id:currentClinic.id,compliance_reference:reference,uploaded_by:currentUser.id,object_path:path,original_file_name:file.name.slice(0,255),mime_type:file.type,file_size_bytes:file.size,evidence_caption:$("complianceEvidenceCaption").value.trim()||null});
   if(metaError)throw metaError;
   form.reset();say(message,"Evidence uploaded to the private clinic vault and linked to "+reference+".");await loadEvidence();
  }catch(err){say(message,"Upload failed: "+(err.message||"Check permissions and connection."),true);}
  finally{uploadBtn.disabled=false;}
 });
 $("generateCompliancePack").addEventListener("click",async()=>{
  const btn=$("generateCompliancePack");btn.disabled=true;
  try{
   const db=client();
   const [reg,evi]=await Promise.all([
    db.from("hospital_compliance_register").select("record_reference,record_type,framework,requirement_title,department_name,responsible_officer,severity,due_date,review_frequency,description,evidence_reference,related_reference,status,created_at").eq("clinic_id",currentClinic.id).order("created_at",{ascending:true}).limit(1000),
    db.from("hospital_compliance_evidence").select("compliance_reference,original_file_name,mime_type,file_size_bytes,evidence_caption,created_at").eq("clinic_id",currentClinic.id).order("created_at",{ascending:true}).limit(1000)
   ]);
   if(reg.error)throw reg.error;if(evi.error)throw evi.error;
   const records=reg.data||[],evidence=evi.data||[],date=new Date().toLocaleString();
   const rowsHtml=records.map(r=>'<tr><td>'+esc(r.record_reference)+'</td><td>'+esc(r.record_type.replace(/_/g," "))+'</td><td>'+esc(r.framework)+'</td><td>'+esc(r.requirement_title)+'</td><td>'+esc(r.department_name)+'</td><td>'+esc(r.responsible_officer)+'</td><td>'+esc(r.severity)+'</td><td>'+esc(r.due_date||"—")+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.description)+'</td></tr>').join("");
   const evidenceHtml=evidence.map(r=>'<tr><td>'+esc(r.compliance_reference)+'</td><td>'+esc(r.original_file_name)+'</td><td>'+esc(r.mime_type)+'</td><td>'+Math.ceil(r.file_size_bytes/1024)+' KB</td><td>'+esc(r.evidence_caption||"—")+'</td><td>'+esc(new Date(r.created_at).toLocaleString())+'</td></tr>').join("");
   const doc='<!doctype html><html><head><meta charset="utf-8"><title>HealthOS AI Compliance Documentation Pack</title><style>body{font:12px Arial,sans-serif;color:#172033;margin:28px}h1,h2{color:#17345c}p{line-height:1.5}.meta{background:#f2f5f9;padding:12px}table{width:100%;border-collapse:collapse;margin:14px 0 28px}th,td{border:1px solid #cbd3df;padding:7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf0f7}small{color:#475569}.notice{border:1px solid #a66;padding:12px;margin:18px 0}@media print{body{margin:12mm}button{display:none}tr{break-inside:avoid}}</style></head><body><h1>HealthOS AI — Compliance Documentation Pack</h1><div class="meta"><p><b>Generated:</b> '+esc(date)+'<br><b>Clinic reference:</b> '+esc(currentClinic.id)+'<br><b>Register records:</b> '+records.length+'<br><b>Evidence files indexed:</b> '+evidence.length+'</p></div><div class="notice"><b>Important:</b> This is an operational evidence index generated from records currently stored in HealthOS AI. It is not a regulatory certificate, legal opinion, proof of compliance, or confirmation that evidence has been independently verified. A qualified compliance officer and relevant regulator must assess requirements and evidence.</div><h2>1. Compliance Register</h2><table><thead><tr><th>Reference</th><th>Type</th><th>Framework</th><th>Requirement / finding</th><th>Department</th><th>Responsible officer</th><th>Severity</th><th>Due date</th><th>Status</th><th>Details</th></tr></thead><tbody>'+rowsHtml+'</tbody></table><h2>2. Evidence Inventory</h2><table><thead><tr><th>Linked reference</th><th>File</th><th>Type</th><th>Size</th><th>Description</th><th>Uploaded</th></tr></thead><tbody>'+evidenceHtml+'</tbody></table><p><small>Evidence files remain in the private HealthOS AI vault. This pack lists their metadata; it does not embed the original files. Retrieve files through the authenticated Evidence Vault.</small></p><button onclick="window.print()">Print / Save as PDF</button></body></html>';
   const blob=new Blob([doc],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="HealthOS_Compliance_Pack_"+new Date().toISOString().slice(0,10)+".html";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   say($("compliancePackMessage"),"Documentation pack generated. Open the downloaded HTML file and choose Print → Save as PDF to create a PDF copy.");
  }catch(err){say($("compliancePackMessage"),"Pack generation failed: "+(err.message||"Check access and connection."),true);}
  finally{btn.disabled=false;}
 });
 document.addEventListener("DOMContentLoaded",()=>{loadReferences().catch(e=>say(message,e.message,true));loadEvidence().catch(e=>say(message,e.message,true));});
 window.loadComplianceEvidenceVault=()=>Promise.all([loadReferences(),loadEvidence()]);
})();
