create or replace function public.get_management_appointment_options(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_staff jsonb; v_depts jsonb; v_units jsonb; v_current jsonb;
begin
 select role into v_role from public.clinic_memberships where clinic_id=p_clinic_id and user_id=v_uid and status='active' limit 1;
 if v_role is null or v_role not in ('owner','admin') then raise exception 'Hospital administrator access required'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('assignment_id',a.id,'staff_profile_id',sp.id,'name',sp.full_name,'staff_id',sp.staff_id,'department_id',a.department_id,'department_name',d.department_name,'unit_id',a.unit_id,'unit_name',u.unit_name) order by d.department_name,sp.full_name),'[]'::jsonb) into v_staff
 from public.staff_department_assignments a join public.staff_profiles sp on sp.id=a.staff_profile_id and sp.clinic_id=a.clinic_id join public.clinic_departments d on d.id=a.department_id and d.clinic_id=a.clinic_id left join public.clinic_units u on u.id=a.unit_id and u.clinic_id=a.clinic_id
 where a.clinic_id=p_clinic_id and a.assignment_status='active' and sp.employment_status='active' and a.effective_from<=current_date and (a.effective_to is null or a.effective_to>=current_date);
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',department_name) order by department_name),'[]'::jsonb) into v_depts from public.clinic_departments where clinic_id=p_clinic_id and is_active;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'department_id',department_id,'name',unit_name) order by unit_name),'[]'::jsonb) into v_units from public.clinic_units where clinic_id=p_clinic_id and is_active;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'department_id',m.department_id,'department_name',d.department_name,'unit_id',m.unit_id,'unit_name',u.unit_name,'manager_name',sp.full_name,'staff_id',sp.staff_id,'role',m.leadership_role,'status',m.assignment_status,'effective_from',m.effective_from,'effective_to',m.effective_to) order by d.department_name,m.leadership_role),'[]'::jsonb) into v_current
 from public.clinic_management_assignments m join public.clinic_departments d on d.id=m.department_id and d.clinic_id=m.clinic_id join public.staff_department_assignments a on a.id=m.manager_assignment_id and a.clinic_id=m.clinic_id join public.staff_profiles sp on sp.id=a.staff_profile_id and sp.clinic_id=a.clinic_id left join public.clinic_units u on u.id=m.unit_id and u.clinic_id=m.clinic_id
 where m.clinic_id=p_clinic_id and m.assignment_status in ('active','delegated','on_leave');
 return jsonb_build_object('staff_assignments',v_staff,'departments',v_depts,'units',v_units,'appointments',v_current);
end; $$;
create or replace function public.appoint_clinic_department_manager(
 p_clinic_id uuid,p_department_id uuid,p_unit_id uuid,p_manager_assignment_id uuid,p_leadership_role text,p_effective_from date,p_effective_to date,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_role text; v_id uuid;
begin
 select role into v_role from public.clinic_memberships where clinic_id=p_clinic_id and user_id=v_uid and status='active' limit 1;
 if v_role is null or v_role not in ('owner','admin') then raise exception 'Only hospital owners or administrators can appoint supervisors'; end if;
 if p_leadership_role not in ('department_head','deputy_head','department_supervisor','unit_head','unit_supervisor','coordinator') then raise exception 'Invalid leadership role'; end if;
 if p_effective_from is null or (p_effective_to is not null and p_effective_to<p_effective_from) then raise exception 'Invalid appointment dates'; end if;
 if length(coalesce(p_notes,''))>2000 then raise exception 'Appointment notes are too long'; end if;
 if not exists(select 1 from public.clinic_departments d where d.id=p_department_id and d.clinic_id=p_clinic_id and d.is_active) then raise exception 'Active department not found'; end if;
 if p_unit_id is not null and not exists(select 1 from public.clinic_units u where u.id=p_unit_id and u.clinic_id=p_clinic_id and u.department_id=p_department_id and u.is_active) then raise exception 'Unit does not belong to selected department'; end if;
 if (p_unit_id is null and p_leadership_role in ('unit_head','unit_supervisor')) or (p_unit_id is not null and p_leadership_role in ('department_head','deputy_head','department_supervisor')) then raise exception 'Leadership role does not match department/unit scope'; end if;
 if exists(select 1 from public.clinic_management_assignments m where m.clinic_id=p_clinic_id and m.department_id=p_department_id and m.unit_id is not distinct from p_unit_id and m.leadership_role=p_leadership_role and m.assignment_status in ('active','delegated','on_leave') and daterange(m.effective_from,coalesce(m.effective_to+1,'infinity'::date),'[)') && daterange(p_effective_from,coalesce(p_effective_to+1,'infinity'::date),'[)')) then raise exception 'An appointment already occupies this leadership role during the selected dates'; end if;
 insert into public.clinic_management_assignments(clinic_id,department_id,unit_id,manager_assignment_id,leadership_role,assignment_status,effective_from,effective_to,appointment_notes,appointed_by)
 values(p_clinic_id,p_department_id,p_unit_id,p_manager_assignment_id,p_leadership_role,'active',p_effective_from,p_effective_to,nullif(trim(coalesce(p_notes,'')),''),v_uid)
 returning id into v_id;
 return jsonb_build_object('success',true,'appointment_id',v_id);
end; $$;
revoke all on function public.get_management_appointment_options(uuid) from public,anon;
grant execute on function public.get_management_appointment_options(uuid) to authenticated;
revoke all on function public.appoint_clinic_department_manager(uuid,uuid,uuid,uuid,text,date,date,text) from public,anon;
grant execute on function public.appoint_clinic_department_manager(uuid,uuid,uuid,uuid,text,date,date,text) to authenticated;