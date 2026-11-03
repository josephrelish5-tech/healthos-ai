/* HealthOS Departmental Knowledge Centre */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const clinicId=()=>typeof currentClinic!=="undefined"&&currentClinic?(currentClinic.id||currentClinic.clinic_id):null;
const notify=(m)=>{const e=$("dkcMessage");if(e)e.textContent=m;};
let isOwner=false,departments=[],articles=[];
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
 departments.forEach(d=>{const o=document.createElement("option");o.value=d.id;o.textContent=d.department_name;select.append(o);});
 $("dkcAdminPanel").hidden=!isOwner;
 if(!departments.length)notify("No active departments are configured. An administrator must create departments first.");
 await load();
}
async function load(){
 if(!clinicId())return;
 const {data,error}=await supabaseClient.from("department_knowledge_articles").select("id,department_id,article_type,title,summary,content,keywords,workspace_section_id,status,version,updated_at").eq("clinic_id",clinicId()).order("updated_at",{ascending:false}).limit(500);
 if(error){notify("Knowledge access error: "+error.message);return;}
 articles=data||[];render(articles);$("dkcAccessibleCount").textContent=articles.length;
}
function render(rows){
 const body=$("dkcRows");body.replaceChildren();
 if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No knowledge articles are available for your assigned department(s).";tr.append(td);body.append(tr);return;}
 rows.forEach(a=>{const tr=document.createElement("tr");const dept=departments.find(d=>d.id===a.department_id);[dept?.department_name||"Department",types[a.article_type]||a.article_type,a.title,a.status,"v"+a.version,new Date(a.updated_at).toLocaleString()].forEach(x=>{const td=document.createElement("td");td.textContent=esc(x);tr.append(td);});const td=document.createElement("td");const b=document.createElement("button");b.type="button";b.textContent="Read";b.addEventListener("click",()=>read(a));td.append(b);if(isOwner){const p=document.createElement("button");p.type="button";p.textContent=a.status==="published"?"Archive":"Publish";p.addEventListener("click",()=>changeStatus(a,a.status==="published"?"archived":"published"));td.append(p);}tr.append(td);body.append(tr);});
}
function read(a){$("dkcArticleTitle").textContent=a.title;$("dkcArticleMeta").textContent=(types[a.article_type]||a.article_type)+" · "+(departments.find(d=>d.id===a.department_id)?.department_name||"Department")+" · v"+a.version;$("dkcArticleContent").textContent=(a.summary?a.summary+"\n\n":"")+a.content;$("dkcArticleReader").hidden=false;$("dkcArticleReader").scrollIntoView({behavior:"smooth",block:"nearest"});if(a.workspace_section_id)$("dkcOpenWorkspace").onclick=()=>{const el=document.getElementById(a.workspace_section_id);if(el){const p=el.closest(".panel");if(p&&typeof window.showHealthOSView==="function")window.showHealthOSView(p.id);el.scrollIntoView({behavior:"smooth",block:"start"});}else notify("The linked workspace is not available in this app version.");};else $("dkcOpenWorkspace").onclick=null;}
async function changeStatus(a,status){if(!isOwner)return;const {error}=await supabaseClient.from("department_knowledge_articles").update({status,updated_by:currentUser.id,updated_at:new Date().toISOString(),published_at:status==="published"?new Date().toISOString():null,version:a.version+1}).eq("id",a.id).eq("clinic_id",clinicId());if(error){notify("Could not update article: "+error.message);return;}notify("Article "+status+".");await load();}
async function save(e){e.preventDefault();if(!isOwner){notify("Only the clinic owner can publish or manage departmental knowledge.");return;}const row={clinic_id:clinicId(),department_id:$("dkcDepartment").value,article_type:$("dkcType").value,title:$("dkcTitle").value.trim(),summary:$("dkcSummary").value.trim()||null,content:$("dkcContent").value.trim(),keywords:$("dkcKeywords").value.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,30),workspace_section_id:$("dkcWorkspace").value.trim()||null,status:"draft",created_by:currentUser.id,updated_by:currentUser.id};if(!row.department_id||row.title.length<3||row.content.length<10){notify("Choose a department and enter a title and complete instruction.");return;}const {error}=await supabaseClient.from("department_knowledge_articles").insert(row);if(error){notify("Save failed: "+error.message);return;}$("dkcForm").reset();notify("Draft saved. Review it and select Publish when it is ready for staff.");await load();}
function search(){const q=$("dkcSearch").value.toLowerCase().trim();const filtered=articles.filter(a=>a.status==="published"&&(!q||[a.title,a.summary,a.content,(a.keywords||[]).join(" "),types[a.article_type]].join(" ").toLowerCase().includes(q)));render(filtered);}
document.addEventListener("DOMContentLoaded",()=>{$("dkcForm")?.addEventListener("submit",save);$("dkcSearchButton")?.addEventListener("click",search);$("dkcSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();search();}});$("dkcRefresh")?.addEventListener("click",load);$("dkcCloseReader")?.addEventListener("click",()=>$("dkcArticleReader").hidden=true);init();});
window.healthOSDepartmentKnowledgeSearch=async function(query){if(!clinicId()||!currentUser)return null;if(!departments.length)await init();const q=String(query||"").toLowerCase().trim();const found=articles.filter(a=>a.status==="published"&&[a.title,a.summary,a.content,(a.keywords||[]).join(" ")].join(" ").toLowerCase().includes(q)).slice(0,3);return found;};
})();