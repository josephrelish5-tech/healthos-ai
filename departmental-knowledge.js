/* HealthOS Departmental Knowledge Centre */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const clinicId=()=>typeof currentClinic!=="undefined"&&currentClinic?(currentClinic.id||currentClinic.clinic_id):null;
const notify=(m)=>{const e=$("dkcMessage");if(e)e.textContent=m;};
let isOwner=false,departments=[],articles=[],owners=[];
const types={department_duty:"Department duties",standard_operating_procedure:"Standard operating procedure",work_instruction:"Work instruction",faq:"Frequently asked question",navigation_guide:"Navigation guide",policy_reference:"Policy reference"};
function esc(v){return String(v??"");}
async function init(){
 if(typeof supabaseClient==="undefined"||typeof currentUser==="undefined"||!currentUser||!clinicId()){notify("Sign in and select a clinic to use the Knowledge Centre.");return;}
 const [mem,dept]=await Promise.all([
  supabaseClient.from("clinic_memberships").select("role,status").eq("clinic_id",clinicId()).eq("user_id",currentUser.id).eq("status","active").maybeSingle(),
  supabaseClient.from("clinic_departments").select("id,department_name,department_code").eq("clinic_id",clinicId()).eq("is_active",true).order("department_name")
 ]);
 if(dept.error){notify("Could not load departments: "+dept.error.message);return;}
 departments=dept.data||[];
 isOwner=!!mem.data&&["owner","clinic_owner","super_admin"].includes(String(mem.data.role||"").toLowerCase());
 const select=$("dkcDepartment");select.replaceChildren();
 departments.forEach(d=>{const o=document.createElement("option");o.value=d.id;o.textContent=d.department_name;select.append(o);const oo=document.createElement("option");oo.value=d.id;oo.textContent=d.department_name;$("dkcOwnerDepartment")?.append(oo);});
 $("dkcAdminPanel").hidden=!isOwner;
 if(!departments.length)notify("No active departments are configured. An administrator must create departments first.");
 await load();
}
async function load(){
 if(!clinicId())return;
 const {data,error}=await supabaseClient.from("department_knowledge_articles").select("id,department_id,article_type,title,summary,content,keywords,workspace_section_id,status,version,updated_at,review_due_at,review_status,reviewed_by,reviewed_at,created_by").eq("clinic_id",clinicId()).order("updated_at",{ascending:false}).limit(500);
 if(error){notify("Knowledge access error: "+error.message);return;}
 articles=data||[];render(articles);$("dkcAccessibleCount").textContent=articles.length;
 const today=new Date().toISOString().slice(0,10);
 const overdue=articles.filter(a=>a.status==="published"&&a.review_due_at&&a.review_due_at<today).length;
 const dueSoon=articles.filter(a=>a.status==="published"&&a.review_due_at&&a.review_due_at>=today&&a.review_due_at<=new Date(Date.now()+30*86400000).toISOString().slice(0,10)).length;
 if($("dkcGovernanceAlerts"))$("dkcGovernanceAlerts").textContent=overdue+" overdue reviews · "+dueSoon+" due within 30 days";
 if(isOwner)await loadOwners();
 if(isOwner)renderOverlapCandidates();
}
async function loadOwners(){
 const {data,error}=await supabaseClient.from("department_knowledge_owners").select("id,department_id,user_id,stewardship_role,is_active").eq("clinic_id",clinicId()).order("created_at",{ascending:false});
 if(error){notify("Could not load knowledge ownership assignments: "+error.message);return;}
 owners=data||[];const body=$("dkcOwnerRows");if(!body)return;body.replaceChildren();
 owners.forEach(o=>{const tr=document.createElement("tr");const d=departments.find(x=>x.id===o.department_id);[d?.department_name||"Department",o.user_id,o.stewardship_role,o.is_active?"Active":"Inactive"].forEach(v=>{const td=document.createElement("td");td.textContent=String(v);tr.append(td);});const td=document.createElement("td");const b=document.createElement("button");b.type="button";b.textContent=o.is_active?"Deactivate":"Reactivate";b.addEventListener("click",async()=>{const {error}=await supabaseClient.from("department_knowledge_owners").update({is_active:!o.is_active}).eq("id",o.id).eq("clinic_id",clinicId());if(error){notify(error.message);return;}await loadOwners();});td.append(b);tr.append(td);body.append(tr);});
}
async function saveOwner(e){
 e.preventDefault();if(!isOwner)return;
 const row={clinic_id:clinicId(),department_id:$("dkcOwnerDepartment").value,user_id:$("dkcOwnerUser").value.trim(),stewardship_role:$("dkcOwnerRole").value,assigned_by:currentUser.id,is_active:true};
 if(!row.department_id||!/^[0-9a-f-]{36}$/i.test(row.user_id)){notify("Select a department and enter a valid staff user UUID.");return;}
 const {error}=await supabaseClient.from("department_knowledge_owners").upsert(row,{onConflict:"clinic_id,department_id,user_id,stewardship_role"});
 if(error){notify("Ownership assignment failed: "+error.message);return;}
 $("dkcOwnerForm").reset();notify("Department knowledge responsibility assigned.");await loadOwners();
}
function renderOverlapCandidates(){
 const box=$("dkcOverlapAlerts");if(!box)return;box.replaceChildren();
 const candidates=[];
 const live=articles.filter(a=>a.status==="published"&&a.review_status==="approved");
 for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
  const a=live[i],b=live[j];if(a.department_id!==b.department_id)continue;
  const at=new Set([...tokenize(a.title),...(a.keywords||[]).flatMap(tokenize)]);
  const bt=new Set([...tokenize(b.title),...(b.keywords||[]).flatMap(tokenize)]);
  const common=[...at].filter(t=>bt.has(t));
  const ratio=common.length/Math.max(1,Math.min(at.size,bt.size));
  if(common.length>=2&&ratio>=0.55)candidates.push({a,b,common});
 }
 if(!candidates.length){box.textContent="No likely title/keyword overlaps detected. This is a heuristic check, not proof that instructions do not conflict.";return;}
 candidates.slice(0,20).forEach(x=>{const p=document.createElement("p");p.textContent="Potential overlap in "+(departments.find(d=>d.id===x.a.department_id)?.department_name||"department")+": “"+x.a.title+"” and “"+x.b.title+"” (shared terms: "+x.common.join(", ")+"). Human review required.";box.append(p);});
}
function render(rows){
 const body=$("dkcRows");body.replaceChildren();
 if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No knowledge articles are available for your assigned department(s).";tr.append(td);body.append(tr);return;}
 rows.forEach(a=>{const tr=document.createElement("tr");const dept=departments.find(d=>d.id===a.department_id);[dept?.department_name||"Department",types[a.article_type]||a.article_type,a.title,a.status,"v"+a.version,new Date(a.updated_at).toLocaleString()].forEach(x=>{const td=document.createElement("td");td.textContent=esc(x);tr.append(td);});const td=document.createElement("td");const b=document.createElement("button");b.type="button";b.textContent="Read";b.addEventListener("click",()=>read(a));td.append(b);if(isOwner){
  const hist=document.createElement("button");hist.type="button";hist.textContent="History";hist.addEventListener("click",()=>showHistory(a));td.append(hist);
  const review=document.createElement("button");review.type="button";review.textContent=a.review_status==="approved"?"Reviewed":"Approve review";
  review.disabled=a.review_status==="approved"||a.created_by===currentUser.id||a.status==="archived";
  review.title=review.disabled?(a.created_by===currentUser.id?"A different owner must review this article":"Already reviewed"):"Independent review required";
  review.addEventListener("click",()=>approveArticle(a));td.append(review);
  const p=document.createElement("button");p.type="button";p.textContent=a.status==="published"?"Archive":"Publish";
  p.disabled=a.status!=="published"&&a.review_status!=="approved";
  p.title=p.disabled?"An independent owner must approve this article before publication":"";
  p.addEventListener("click",()=>changeStatus(a,a.status==="published"?"archived":"published"));td.append(p);
}tr.append(td);body.append(tr);});
}
function read(a){$("dkcArticleTitle").textContent=a.title;$("dkcArticleMeta").textContent=(types[a.article_type]||a.article_type)+" · "+(departments.find(d=>d.id===a.department_id)?.department_name||"Department")+" · v"+a.version;$("dkcArticleContent").textContent=(a.summary?a.summary+"\n\n":"")+a.content;$("dkcArticleReader").hidden=false;$("dkcArticleReader").scrollIntoView({behavior:"smooth",block:"nearest"});if(a.review_due_at&&new Date(a.review_due_at+"T23:59:59")<new Date())$("dkcArticleMeta").textContent+=" · REVIEW OVERDUE — verify before relying on this instruction";if(a.workspace_section_id)$("dkcOpenWorkspace").onclick=()=>{const el=document.getElementById(a.workspace_section_id);if(el){const p=el.closest(".panel");if(p&&typeof window.showHealthOSView==="function")window.showHealthOSView(p.id);el.scrollIntoView({behavior:"smooth",block:"start"});}else notify("The linked workspace is not available in this app version.");};else $("dkcOpenWorkspace").onclick=null;}
async function showHistory(a){
 const {data,error}=await supabaseClient.from("department_knowledge_article_versions").select("version_number,action,title,status,review_status,changed_at,changed_by").eq("article_id",a.id).eq("clinic_id",clinicId()).order("version_number",{ascending:false}).limit(30);
 if(error){notify("Version history is available to clinic owners only: "+error.message);return;}
 $("dkcArticleTitle").textContent="Version history · "+a.title;
 $("dkcArticleMeta").textContent="Immutable change snapshots · latest 30 versions";
 $("dkcArticleContent").textContent=(data||[]).map(v=>"v"+v.version_number+" · "+v.action+" · "+v.status+" · "+v.review_status+" · "+new Date(v.changed_at).toLocaleString()+"\n"+v.title).join("\n\n")||"No version snapshots recorded yet.";
 $("dkcArticleReader").hidden=false;$("dkcArticleReader").scrollIntoView({behavior:"smooth",block:"nearest"});
}
async function approveArticle(a){
 if(!isOwner||a.created_by===currentUser.id||a.status==="archived")return;
 const {error}=await supabaseClient.from("department_knowledge_articles").update({review_status:"approved",reviewed_by:currentUser.id,reviewed_at:new Date().toISOString(),review_notes:"Independently reviewed by clinic owner.",updated_by:currentUser.id,updated_at:new Date().toISOString(),version:a.version+1}).eq("id",a.id).eq("clinic_id",clinicId());
 if(error){notify("Review approval failed: "+error.message);return;}notify("Independent review recorded. The article can now be published.");await load();
}
async function changeStatus(a,status){if(!isOwner)return;if(status==="published"&&a.review_status!=="approved"){notify("An independent owner review is required before publication.");return;}const {error}=await supabaseClient.from("department_knowledge_articles").update({status,updated_by:currentUser.id,updated_at:new Date().toISOString(),published_at:status==="published"?new Date().toISOString():null,version:a.version+1}).eq("id",a.id).eq("clinic_id",clinicId());if(error){notify("Could not update article: "+error.message);return;}notify("Article "+status+".");await load();}
async function save(e){e.preventDefault();if(!isOwner){notify("Only the clinic owner can publish or manage departmental knowledge.");return;}const row={clinic_id:clinicId(),department_id:$("dkcDepartment").value,article_type:$("dkcType").value,title:$("dkcTitle").value.trim(),summary:$("dkcSummary").value.trim()||null,content:$("dkcContent").value.trim(),keywords:$("dkcKeywords").value.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,30),workspace_section_id:$("dkcWorkspace").value.trim()||null,status:"draft",review_status:"pending_review",review_due_at:$("dkcReviewDue")?.value||null,created_by:currentUser.id,updated_by:currentUser.id};if(!row.department_id||row.title.length<3||row.content.length<10){notify("Choose a department and enter a title and complete instruction.");return;}const {error}=await supabaseClient.from("department_knowledge_articles").insert(row);if(error){notify("Save failed: "+error.message);return;}$("dkcForm").reset();notify("Draft saved. Review it and select Publish when it is ready for staff.");await load();}
function search(){const q=$("dkcSearch").value.toLowerCase().trim();const filtered=articles.filter(a=>a.status==="published"&&a.review_status==="approved"&&(!q||[a.title,a.summary,a.content,(a.keywords||[]).join(" "),types[a.article_type]].join(" ").toLowerCase().includes(q)));render(filtered);}
document.addEventListener("DOMContentLoaded",()=>{$("dkcOwnerForm")?.addEventListener("submit",saveOwner);$("dkcForm")?.addEventListener("submit",save);$("dkcSearchButton")?.addEventListener("click",search);$("dkcSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search();}});$("dkcRefresh")?.addEventListener("click",load);$("dkcCloseReader")?.addEventListener("click",()=>$("dkcArticleReader").hidden=true);init();});
const stopWords=new Set(["the","a","an","is","are","was","were","to","for","of","in","on","at","and","or","how","what","where","when","who","can","do","does","i","we","my","our","your","me","please","help","with","about","from","this","that","it","should","would","could","use","using"]);
const synonymGroups=[
 ["medicine","medicines","drug","drugs","medication","medications"],
 ["stock","inventory","supplies","items"],
 ["expiry","expiration","expiring","expired"],
 ["payment","payments","paid","receipt","receipts","transaction"],
 ["invoice","invoices","billing","bill","charge","charges"],
 ["appointment","appointments","booking","schedule","scheduling"],
 ["patient","patients","client"],
 ["incident","incidents","event","events","hazard"],
 ["staff","employee","employees","personnel"],
 ["attendance","clockin","clockout","shift","roster"],
 ["procedure","procedures","sop","protocol","workflow","instruction"],
 ["record","records","document","documentation","note","notes"],
 ["handover","handoff","transfer"],
 ["reconcile","reconciliation","matching","match"],
 ["license","licence","credential","credentials","registration"],
 ["quality","accreditation","indicator","improvement"]
];
function expandTokens(tokens){const out=new Set(tokens);synonymGroups.forEach(group=>{if(group.some(x=>tokens.includes(x)))group.forEach(x=>out.add(x));});return [...out];}
function tokenize(text){return String(text||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(t=>t.length>1&&!stopWords.has(t));}
window.healthOSDepartmentKnowledgeSearch=async function(query){
 if(!clinicId()||!currentUser)return null;
 if(!departments.length)await init();
 const raw=String(query||"").trim(),tokens=tokenize(raw);
 if(!tokens.length)return [];
 const expanded=expandTokens(tokens);
 const scored=articles.filter(a=>a.status==="published"&&a.review_status==="approved").map(a=>{
  const title=tokenize(a.title),summary=tokenize(a.summary),keywords=tokenize((a.keywords||[]).join(" ")),content=tokenize(a.content);
  const hay=[...title,...summary,...keywords,...content],haySet=new Set(hay);
  let score=0,matched=[];
  tokens.forEach(t=>{if(title.includes(t)){score+=9;matched.push(t);}else if(keywords.includes(t)){score+=7;matched.push(t);}else if(summary.includes(t)){score+=5;matched.push(t);}else if(content.includes(t)){score+=2;matched.push(t);}});
  expanded.filter(t=>!tokens.includes(t)).forEach(t=>{if(haySet.has(t))score+=1;});
  if(raw.length>5&&a.title.toLowerCase().includes(raw.toLowerCase()))score+=12;
  const phrase=raw.toLowerCase();if(a.title.toLowerCase().includes(phrase))score+=10;if(a.summary&&a.summary.toLowerCase().includes(phrase))score+=4;
  const uniqueMatched=[...new Set(matched)];
  const coverage=uniqueMatched.length/Math.max(1,tokens.length);
  if(coverage<0.25)score=0;
  return {...a,_departmentName:departments.find(d=>d.id===a.department_id)?.department_name||'Assigned department',_score:score,_matched:uniqueMatched,_coverage:coverage};
 }).filter(a=>a._score>=3).sort((a,b)=>b._score-a._score||new Date(b.updated_at)-new Date(a.updated_at));
 return scored.slice(0,5);
};
})();