create or replace function public.review_supervisor_staff_task(
 p_clinic_id uuid,p_task_id uuid,p_decision text,p_notes text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid:=auth.uid(); v_profile_id uuid; v_role text; v_task public.staff_tasks%rowtype; v_assignee_profile_id uuid; v_allowed boolean:=false; v_new_status text; v_event text;
begin
 if v_user_id is null then raise exception 'Authentication required'; end if;
 if p_decision not in ('approved','rejected','changes_requested') then raise exception 'Invalid review decision'; end if;
 if p_decision in ('rejected','changes_requested') and length(trim(coalesce(p_notes,'')))<3 then raise exception 'A reason is required for rejection or requested corrections'; end if;
 if length(coalesce(p_notes,''))>3000 then raise exception 'Review notes are too long'; end if;
 select cm.role into v_role from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_user_id and cm.status='active' limit 1;
 if v_role is null then raise exception 'Active hospital membership required'; end if;
 select sp.id into v_profile_id from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_user_id and sp.employment_status='active' limit 1;
 if v_role not in ('owner','admin') and v_profile_id is null then raise exception 'Active supervisor profile required'; end if;
 select * into v_task from public.staff_tasks t where t.id=p_task_id and t.clinic_id=p_clinic_id and t.task_status='submitted' for update;
 if not found then raise exception 'Submitted task not found'; end if;
 select a.staff_profile_id into v_assignee_profile_id from public.staff_department_assignments a where a.id=v_task.assigned_to_assignment_id and a.clinic_id=p_clinic_id;
 if v_profile_id is not null and v_profile_id=v_assignee_profile_id then raise exception 'The task assignee cannot review their own work'; end if;
 select exists(select 1 from public.staff_department_assignments a where a.id=v_task.assigned_to_assignment_id and a.clinic_id=p_clinic_id and a.supervisor_staff_profile_id=v_profile_id)
 or exists(select 1 from public.clinic_management_assignments m join public.staff_department_assignments ma on ma.id=m.manager_assignment_id and ma.clinic_id=m.clinic_id where m.clinic_id=p_clinic_id and ma.staff_profile_id=v_profile_id and m.assignment_status in ('active','delegated') and m.effective_from<=current_date and (m.effective_to is null or m.effective_to>=current_date) and m.department_id=v_task.department_id and (m.unit_id is null or m.unit_id=v_task.unit_id))
 into v_allowed;
 if v_role not in ('owner','admin') and not v_allowed then raise exception 'You are not authorised to review this department task'; end if;
 if v_task.requires_separate_approval and (v_profile_id is null or v_profile_id=v_assignee_profile_id or v_profile_id=v_task.assigned_by_staff_profile_id) then raise exception 'Separate authorised reviewer required'; end if;
 if p_decision='approved' then v_new_status:='completed'; v_event:='review_approved';
 elsif p_decision='rejected' then v_new_status:='in_progress'; v_event:='review_rejected';
 else v_new_status:='in_progress'; v_event:='changes_requested'; end if;
 update public.staff_tasks set task_status=v_new_status,review_status=p_decision,reviewed_at=now(),reviewed_by_staff_profile_id=v_profile_id,review_notes=nullif(trim(coalesce(p_notes,'')),''),completed_at=case when p_decision='approved' then now() else null end,updated_at=now() where id=p_task_id and clinic_id=p_clinic_id;
 insert into public.staff_task_events(clinic_id,task_id,actor_staff_profile_id,event_type,from_status,to_status,event_notes,metadata)
 values(p_clinic_id,p_task_id,v_profile_id,v_event,'submitted',v_new_status,nullif(trim(coalesce(p_notes,'')),''),jsonb_build_object('decision',p_decision,'reviewer_user_id',v_user_id));
 return jsonb_build_object('success',true,'decision',p_decision,'task_status',v_new_status);
end; $$;
revoke all on function public.review_supervisor_staff_task(uuid,uuid,text,text) from public,anon;
grant execute on function public.review_supervisor_staff_task(uuid,uuid,text,text) to authenticated;