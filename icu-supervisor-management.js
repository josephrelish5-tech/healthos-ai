// HealthOS — ICU supervisor permission management.
// UI controls are advisory; the database RPC enforces owner/admin authority.
(function initICUSupervisorManagement(){
 "use strict";
 const $=id=>document.getElementById(id);
 const msg=(value,isError=false)=>{const el=$("icuSupervisorManagementMessage");if(el){el.textContent=value;el.className="message"+(isError?" error":" success");}};
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let departments=[],roles=[],permissions=[],audit=[];
 const isAdminReady=()=>Boolean(typeof supabaseClient!=="undefined"&&supabaseClient&&typeof currentClinic!=="undefined"&&currentClinic?.id&&typeof currentUser!=="undefined"&&currentUser?.id&&typeof managementVerified!=="undefined"&&managementVerified);
 function setRows(id,rows,columns,emptyText){
  const body=$(id);if(!body)return;body.replaceChildren();
  if(!rows.length){const tr=body.insertRow();const td=tr.insertCell();td.colSpan=columns;td.textContent=emptyText;return;}
  rows.forEach(row=>{const tr=body.insertRow();row.forEach(value=>{const td=tr.insertCell();td.textContent=String(value??"—");});});
 }
 async function loadDepartments(){
  const clinicId=currentClinic.id;
  const {data,error}=await supabaseClient.from("clinic_departments")
   .select("id,department_name,department_code")
   .eq("clinic_id",clinicId).eq("is_active",true)
   .or("department_name.ilike.%nurs%,department_name.ilike.%icu%,department_name.ilike.%intensive care%")
   .order("department_name");
  if(error)throw error;
  departments=data||[];
  const select=$("icuSupervisorDepartment");select.replaceChildren(new Option("Select active Nursing / ICU department",""));
  departments.forEach(d=>select.add(new Option(d.department_name,d.id)));
  if(!departments.length)select.add(new Option("No active Nursing / ICU department is configured",""));
 }
 async function loadRoles(departmentId){
  const select=$("icuSupervisorProfessionalRole");select.disabled=true;
  select.replaceChildren(new Option("Loading verified roles...",""));
  if(!departmentId){select.replaceChildren(new Option("Select a department first",""));return;}
  const {data:links,error:linkError}=await supabaseClient.from("clinic_department_roles")
   .select("professional_role_id").eq("clinic_id",currentClinic.id).eq("department_id",departmentId).eq("is_active",true);
  if(linkError)throw linkError;
  const ids=[...new Set((links||[]).map(x=>x.professional_role_id).filter(Boolean))];
  if(!ids.length){select.replaceChildren(new Option("No active professional roles are linked to this department",""));return;}
  const {data,error}=await supabaseClient.from("clinic_professional_roles")
   .select("id,role_code,role_name").eq("clinic_id",currentClinic.id).eq("is_active",true).in("id",ids).order("role_name");
  if(error)throw error;
  roles=data||[];select.replaceChildren(new Option("Select verified professional role",""));
  roles.forEach(r=>select.add(new Option(r.role_name+" ("+r.role_code+")",r.id)));
  select.disabled=!roles.length;
 }
 async function loadRegisters(){
  if(!isAdminReady()){msg("Re-authenticate as a clinic owner or administrator to manage ICU supervisor access.",true);return;}
  msg("Loading ICU supervisor departments, roles and access history...");
  try{
   await loadDepartments();
   const {data:perm,error:permError}=await supabaseClient.from("clinic_role_permissions")
    .select("id,department,professional_role_key,allowed,created_at")
    .eq("clinic_id",currentClinic.id).eq("resource_key","icu_supervision").eq("action_key","manage")
    .order("created_at",{ascending:false}).limit(300);
   if(permError)throw permError;permissions=perm||[];
   setRows("icuSupervisorPermissionRows",permissions.map(p=>[p.department,p.professional_role_key,p.allowed?"Granted":"Revoked",p.created_at?new Date(p.created_at).toLocaleString():"—"]),4,"No ICU supervisor role permissions have been configured.");
   const {data:events,error:eventError}=await supabaseClient.from("icu_supervisor_permission_audit")
    .select("changed_at,department,professional_role_key,allowed,change_note")
    .eq("clinic_id",currentClinic.id).order("changed_at",{ascending:false}).limit(200);
   if(eventError)throw eventError;audit=events||[];
   setRows("icuSupervisorAuditRows",audit.map(a=>[new Date(a.changed_at).toLocaleString(),a.department,a.professional_role_key,a.allowed?"Granted":"Revoked",a.change_note]),5,"No supervisor access changes have been recorded.");
   msg("Supervisor access register loaded. No staff access has been changed.");
  }catch(error){console.error("ICU supervisor management load failed",error);msg(error.message||"Could not load ICU supervisor management.",true);}
 }
 $("icuSupervisorDepartment")?.addEventListener("change",async e=>{
  try{await loadRoles(e.target.value);}catch(error){msg(error.message||"Could not load professional roles.",true);}
 });
 $("icuSupervisorRefresh")?.addEventListener("click",()=>void loadRegisters());
 $("icuSupervisorPermissionForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!isAdminReady()){msg("Administrator verification is required before changing access.",true);return;}
  const departmentId=$("icuSupervisorDepartment").value;
  const roleId=$("icuSupervisorProfessionalRole").value;
  const note=$("icuSupervisorPermissionNote").value.trim();
  const allowed=$("icuSupervisorPermissionState").value==="true";
  if(!departmentId||!roleId){msg("Select a verified department and professional role.",true);return;}
  if(note.length<5){msg("Enter a reason of at least five characters.",true);return;}
  const button=$("icuSupervisorSavePermission");button.disabled=true;
  try{
   const {data,error}=await supabaseClient.rpc("healthos_icu_set_supervisor_role_permission",{
    p_clinic_id:currentClinic.id,p_department_id:departmentId,p_professional_role_id:roleId,p_allowed:allowed,p_note:note
   });
   if(error)throw error;
   $("icuSupervisorPermissionNote").value="";
   msg((allowed?"ICU supervisor access granted":"ICU supervisor access revoked")+" for "+(data?.professional_role||"the selected role")+". Change recorded in the audit history.");
   await loadRegisters();
  }catch(error){console.error("ICU supervisor permission change failed",error);msg(error.message||"Access change failed. No success has been assumed.",true);}
  finally{button.disabled=false;}
 });
 document.querySelectorAll('#adminStaffDashboard [data-workspace-target="adminLeadership"]').forEach(button=>{
  button.addEventListener("click",()=>{if(isAdminReady())void loadRegisters();});
 });
 window.loadICUSupervisorManagement=loadRegisters;
})();