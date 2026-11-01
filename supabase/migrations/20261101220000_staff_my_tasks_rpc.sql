create or replace function public.get_my_staff_tasks(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_profile_id uuid; v_tasks jsonb;
begin
 if v_user_id is null then raise exception 'Authentication required'; end if;
 if p_clinic_id is null then raise exception 'Clinic is required'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_user_id and cm.status='active' and cm.role not in ('owner','admin')) then raise exception 'Active staff membership required'; end if;
 select sp.id into v_profile_id from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_user_id and sp.employment_status='active' limit 1;
 if v_profile_id is null then raise exception 'Active staff profile not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',t.id,'task_title',t.task_title,'task_description',t.task_description,'priority',t.priority,'task_status',t.task_status,'due_at',t.due_at,'created_at',t.created_at,'accepted_at',t.accepted_at,'started_at',t.started_at,'completed_at',t.completed_at,'requires_evidence',t.requires_evidence,'requires_supervisor_review',t.requires_supervisor_review,'requires_separate_approval',t.requires_separate_approval,'department_name',d.department_name,'unit_name',u.unit_name,'evidence_count',coalesce(ev.evidence_count,0)
 ) order by case t.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,t.due_at nulls last,t.created_at desc),'[]'::jsonb)
 into v_tasks
 from public.staff_tasks t
 join public.staff_department_assignments sda on sda.id=t.assigned_to_assignment_id and sda.clinic_id=t.clinic_id
 join public.clinic_departments d on d.id=t.department_id and d.clinic_id=t.clinic_id
 left join public.clinic_units u on u.id=t.unit_id and u.clinic_id=t.clinic_id
 left join lateral(select count(*)::integer evidence_count from public.staff_task_evidence e where e.clinic_id=t.clinic_id and e.task_id=t.id) ev on true
 where t.clinic_id=p_clinic_id and sda.staff_profile_id=v_profile_id and sda.assignment_status='active' and sda.effective_from<=current_date and (sda.effective_to is null or sda.effective_to>=current_date) and t.task_status not in ('cancelled');
 return jsonb_build_object('tasks',coalesce(v_tasks,'[]'::jsonb));
end; $$;

create or replace function public.update_my_staff_task_status(p_clinic_id uuid,p_task_id uuid,p_new_status text,p_notes text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid:=auth.uid(); v_profile_id uuid; v_task public.staff_tasks%rowtype; v_evidence_count integer; v_allowed boolean:=false;
begin
 if v_user_id is null then raise exception 'Authentication required'; end if;
 if p_clinic_id is null or p_task_id is null then raise exception 'Clinic and task are required'; end if;
 if p_new_status not in ('accepted','in_progress','blocked','submitted') then raise exception 'Unsupported staff task action'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_user_id and cm.status='active' and cm.role not in ('owner','admin')) then raise exception 'Active staff membership required'; end if;
 select sp.id into v_profile_id from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_user_id and sp.employment_status='active' limit 1;
 if v_profile_id is null then raise exception 'Active staff profile not found'; end if;
 select t.* into v_task from public.staff_tasks t join public.staff_department_assignments sda on sda.id=t.assigned_to_assignment_id and sda.clinic_id=t.clinic_id where t.id=p_task_id and t.clinic_id=p_clinic_id and sda.staff_profile_id=v_profile_id and sda.assignment_status='active' and sda.effective_from<=current_date and (sda.effective_to is null or sda.effective_to>=current_date) for update of t;
 if not found then raise exception 'Task not found in your active assignments'; end if;
 v_allowed:=(p_new_status='accepted' and v_task.task_status='assigned') or (p_new_status='in_progress' and v_task.task_status in ('accepted','assigned')) or (p_new_status='blocked' and v_task.task_status in ('accepted','in_progress')) or (p_new_status='submitted' and v_task.task_status in ('accepted','in_progress','blocked'));
 if not v_allowed then raise exception 'Invalid task status transition'; end if;
 if p_new_status='submitted' and v_task.requires_evidence then
  select count(*) into v_evidence_count from public.staff_task_evidence e where e.clinic_id=p_clinic_id and e.task_id=p_task_id and e.submitted_by_staff_profile_id=v_profile_id;
  if v_evidence_count=0 then raise exception 'Evidence is required before submitting this task'; end if;
 end if;
 update public.staff_tasks set task_status=p_new_status,accepted_at=case when p_new_status='accepted' then coalesce(accepted_at,now()) else accepted_at end,started_at=case when p_new_status='in_progress' then coalesce(started_at,now()) else started_at end,updated_at=now() where id=p_task_id and clinic_id=p_clinic_id;
 insert into public.staff_task_events(clinic_id,task_id,actor_staff_profile_id,event_type,from_status,to_status,event_notes)
 values(p_clinic_id,p_task_id,v_profile_id,case p_new_status when 'accepted' then 'accepted' when 'in_progress' then 'started' when 'blocked' then 'blocked' else 'submitted' end,v_task.task_status,p_new_status,nullif(trim(coalesce(p_notes,'')),''));
 return jsonb_build_object('success',true,'task_id',p_task_id,'status',p_new_status);
end; $$;
revoke all on function public.get_my_staff_tasks(uuid) from public,anon;
grant execute on function public.get_my_staff_tasks(uuid) to authenticated;
revoke all on function public.update_my_staff_task_status(uuid,uuid,text,text) from public,anon;
grant execute on function public.update_my_staff_task_status(uuid,uuid,text,text) to authenticated;