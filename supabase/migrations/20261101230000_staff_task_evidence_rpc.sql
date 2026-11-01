create or replace function public.add_my_staff_task_evidence(
 p_clinic_id uuid,p_task_id uuid,p_evidence_type text,p_evidence_text text,p_source_reference text default null
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid:=auth.uid(); v_profile_id uuid; v_evidence_id uuid; v_task_status text;
begin
 if v_user_id is null then raise exception 'Authentication required'; end if;
 if p_clinic_id is null or p_task_id is null then raise exception 'Clinic and task are required'; end if;
 if p_evidence_type not in ('note','barcode','reference','other') then raise exception 'Unsupported evidence type'; end if;
 if length(trim(coalesce(p_evidence_text,'')))=0 and length(trim(coalesce(p_source_reference,'')))=0 then raise exception 'Enter evidence details'; end if;
 if length(coalesce(p_evidence_text,''))>5000 or length(coalesce(p_source_reference,''))>1000 then raise exception 'Evidence is too long'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_user_id and cm.status='active' and cm.role not in ('owner','admin')) then raise exception 'Active staff membership required'; end if;
 select sp.id into v_profile_id from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_user_id and sp.employment_status='active' limit 1;
 if v_profile_id is null then raise exception 'Active staff profile not found'; end if;
 select t.task_status into v_task_status
 from public.staff_tasks t join public.staff_department_assignments sda on sda.id=t.assigned_to_assignment_id and sda.clinic_id=t.clinic_id
 where t.id=p_task_id and t.clinic_id=p_clinic_id and sda.staff_profile_id=v_profile_id and sda.assignment_status='active' and sda.effective_from<=current_date and (sda.effective_to is null or sda.effective_to>=current_date)
 for update of t;
 if not found then raise exception 'Task not found in your active assignments'; end if;
 if v_task_status in ('submitted','completed','cancelled') then raise exception 'Evidence cannot be added after task submission or closure'; end if;
 insert into public.staff_task_evidence(clinic_id,task_id,submitted_by_staff_profile_id,evidence_type,evidence_text,source_reference,captured_at)
 values(p_clinic_id,p_task_id,v_profile_id,p_evidence_type,nullif(trim(coalesce(p_evidence_text,'')),''),nullif(trim(coalesce(p_source_reference,'')),''),now())
 returning id into v_evidence_id;
 insert into public.staff_task_events(clinic_id,task_id,actor_staff_profile_id,event_type,event_notes,metadata)
 values(p_clinic_id,p_task_id,v_profile_id,'evidence_added','Staff added task evidence',jsonb_build_object('evidence_id',v_evidence_id,'evidence_type',p_evidence_type));
 return jsonb_build_object('success',true,'evidence_id',v_evidence_id,'captured_at',now());
end; $$;
revoke all on function public.add_my_staff_task_evidence(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.add_my_staff_task_evidence(uuid,uuid,text,text,text) to authenticated;