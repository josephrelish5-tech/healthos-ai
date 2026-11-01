create or replace function public.get_task_assignment_options(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_profile uuid; v_depts jsonb; v_staff jsonb; v_duties jsonb;
begin
 select role into v_role from public.clinic_memberships where clinic_id=p_clinic_id and user_id=v_uid and status='active' limit 1;
 if v_role is null then raise exception 'Active membership required'; end if;
 select id into v_profile from public.staff_profiles where clinic_id=p_clinic_id and user_id=v_uid and employment_status='active' limit 1;
 if v_role not in ('owner','admin') and v_profile is null then raise exception 'Active staff profile required'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.department_name) order by d.department_name),'[]'::jsonb) into v_depts
 from public.clinic_departments d where d.clinic_id=p_clinic_id and d.is_active and
 (v_role in ('owner','admin') or exists(select 1 from public.clinic_management_assignments m join public.staff_department_assignments ma on ma.id=m.manager_assignment_id where m.clinic_id=p_clinic_id and ma.staff_profile_id=v_profile and m.department_id=d.id and m.assignment_status in ('active','delegated') and m.effective_from<=current_date and (m.effective_to is null or m.effective_to>=current_date)));
 select coalesce(jsonb_agg(jsonb_build_object('assignment_id',a.id,'staff_profile_id',sp.id,'name',sp.full_name,'staff_id',sp.staff_id,'department_id',a.department_id,'department_name',d.department_name,'unit_id',a.unit_id,'unit_name',u.unit_name) order by d.department_name,sp.full_name),'[]'::jsonb) into v_staff
 from public.staff_department_assignments a join public.staff_profiles sp on sp.id=a.staff_profile_id and sp.clinic_id=a.clinic_id join public.clinic_departments d on d.id=a.department_id and d.clinic_id=a.clinic_id left join public.clinic_units u on u.id=a.unit_id and u.clinic_id=a.clinic_id
 where a.clinic_id=p_clinic_id and a.assignment_status='active' and sp.employment_status='active' and a.effective_from<=current_date and (a.effective_to is null or a.effective_to>=current_date)
 and (v_role in ('owner','admin') or exists(select 1 from public.clinic_management_assignments m join public.staff_department_assignments ma on ma.id=m.manager_assignment_id where m.clinic_id=p_clinic_id and ma.staff_profile_id=v_profile and m.department_id=a.department_id and (m.unit_id is null or m.unit_id=a.unit_id) and m.assignment_status in ('active','delegated') and m.effective_from<=current_date and (m.effective_to is null or m.effective_to>=current_date)));
 select coalesce(jsonb_agg(jsonb_build_object('id',du.id,'title',du.duty_title,'department_id',d.id,'department_name',d.department_name,'evidence_required',du.evidence_required,'review_required',du.supervisor_review_required,'separate_approval_required',du.separate_approval_required) order by d.department_name,du.duty_title),'[]'::jsonb) into v_duties
 from public.clinic_job_duties du join public.clinic_job_profiles jp on jp.id=du.job_profile_id and jp.clinic_id=du.clinic_id join public.clinic_department_roles dr on dr.id=jp.department_role_id and dr.clinic_id=jp.clinic_id join public.clinic_departments d on d.id=dr.department_id and d.clinic_id=dr.clinic_id
 where du.clinic_id=p_clinic_id and du.is_active and du.validation_status='hospital_approved' and jp.is_active and jp.validation_status='hospital_approved'
 and (v_role in ('owner','admin') or exists(select 1 from public.clinic_management_assignments m join public.staff_department_assignments ma on ma.id=m.manager_assignment_id where m.clinic_id=p_clinic_id and ma.staff_profile_id=v_profile and m.department_id=d.id and m.assignment_status in ('active','delegated') and m.effective_from<=current_date and (m.effective_to is null or m.effective_to>=current_date)));
 return jsonb_build_object('departments',v_depts,'staff_assignments',v_staff,'approved_duties',v_duties);
end; $$;

create or replace function public.create_supervised_staff_task(
 p_clinic_id uuid,p_assignment_id uuid,p_title text,p_description text,p_priority text,p_due_at timestamptz,p_duty_id uuid default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_profile uuid; v_assignment public.staff_department_assignments%rowtype; v_duty public.clinic_job_duties%rowtype; v_task uuid;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_title,'')))<3 or length(p_title)>200 then raise exception 'Task title must be 3 to 200 characters'; end if;
 if length(coalesce(p_description,''))>3000 then raise exception 'Task description is too long'; end if;
 if p_priority not in ('low','normal','high','urgent') then raise exception 'Invalid task priority'; end if;
 if p_due_at is not null and p_due_at<now() then raise exception 'Deadline must be in the future'; end if;
 select role into v_role from public.clinic_memberships where clinic_id=p_clinic_id and user_id=v_uid and status='active' limit 1;
 if v_role is null then raise exception 'Active membership required'; end if;
 select id into v_profile from public.staff_profiles where clinic_id=p_clinic_id and user_id=v_uid and employment_status='active' limit 1;
 if v_role not in ('owner','admin') and v_profile is null then raise exception 'Active staff profile required'; end if;
 select * into v_assignment from public.staff_department_assignments where id=p_assignment_id and clinic_id=p_clinic_id and assignment_status='active' and effective_from<=current_date and (effective_to is null or effective_to>=current_date);
 if not found then raise exception 'Target staff assignment is not active'; end if;
 if v_role not in ('owner','admin') and not exists(select 1 from public.clinic_management_assignments m join public.staff_department_assignments ma on ma.id=m.manager_assignment_id and ma.clinic_id=m.clinic_id where m.clinic_id=p_clinic_id and ma.staff_profile_id=v_profile and m.department_id=v_assignment.department_id and (m.unit_id is null or m.unit_id=v_assignment.unit_id) and m.assignment_status in ('active','delegated') and m.effective_from<=current_date and (m.effective_to is null or m.effective_to>=current_date)) then raise exception 'You cannot assign tasks outside your managed department or unit'; end if;
 if p_duty_id is not null then
  select * into v_duty from public.clinic_job_duties where id=p_duty_id and clinic_id=p_clinic_id and is_active and validation_status='hospital_approved';
  if not found then raise exception 'Only hospital-approved duties can be linked to tasks'; end if;
  if not exists(select 1 from public.clinic_job_profiles jp join public.clinic_department_roles dr on dr.id=jp.department_role_id and dr.clinic_id=jp.clinic_id where jp.id=v_duty.job_profile_id and jp.clinic_id=p_clinic_id and jp.validation_status='hospital_approved' and jp.is_active and dr.department_id=v_assignment.department_id) then raise exception 'Duty does not belong to the assigned department'; end if;
 end if;
 insert into public.staff_tasks(clinic_id,duty_id,department_id,unit_id,assigned_to_assignment_id,assigned_by_staff_profile_id,requested_by_staff_profile_id,task_title,task_description,priority,task_status,due_at,requires_evidence,requires_supervisor_review,requires_separate_approval,created_by)
 values(p_clinic_id,p_duty_id,v_assignment.department_id,v_assignment.unit_id,p_assignment_id,v_profile,v_profile,trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_priority,'assigned',p_due_at,coalesce(v_duty.evidence_required,false),coalesce(v_duty.supervisor_review_required,true),coalesce(v_duty.separate_approval_required,false),v_uid)
 returning id into v_task;
 insert into public.staff_task_events(clinic_id,task_id,actor_staff_profile_id,event_type,to_status,event_notes,metadata)
 values(p_clinic_id,v_task,v_profile,'assigned','assigned','Task assigned',jsonb_build_object('assigned_by_user_id',v_uid,'assignment_id',p_assignment_id));
 return jsonb_build_object('success',true,'task_id',v_task);
end; $$;
revoke all on function public.get_task_assignment_options(uuid) from public,anon;
grant execute on function public.get_task_assignment_options(uuid) to authenticated;
revoke all on function public.create_supervised_staff_task(uuid,uuid,text,text,text,timestamptz,uuid) from public,anon;
grant execute on function public.create_supervised_staff_task(uuid,uuid,text,text,text,timestamptz,uuid) to authenticated;