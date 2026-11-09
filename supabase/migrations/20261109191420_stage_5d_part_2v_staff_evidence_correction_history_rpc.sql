-- Stage 5D Part 2V: authenticated staff access to their own evidence correction history.
create or replace function public.get_my_staff_task_evidence_correction_history(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_uid uuid:=auth.uid(); v_profile uuid; v_rows jsonb;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_clinic_id is null then raise exception 'Clinic is required' using errcode='22023'; end if;
 if not exists(select 1 from public.clinic_memberships cm where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' and cm.role not in ('owner','admin')) then
  raise exception 'Active staff membership required' using errcode='42501';
 end if;
 select sp.id into v_profile from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active' limit 1;
 if v_profile is null then raise exception 'Active staff profile not found' using errcode='42501'; end if;
 select coalesce(jsonb_agg(x.item order by x.captured_at desc),'[]'::jsonb) into v_rows
 from (
  select e.captured_at,jsonb_build_object(
   'evidence_id',e.id,'task_id',e.task_id,'task_title',t.task_title,'evidence_type',e.evidence_type,
   'evidence_text',e.evidence_text,'source_reference',e.source_reference,'captured_at',e.captured_at,
   'requests',coalesce((select jsonb_agg(jsonb_build_object(
    'request_id',r.id,'reason',r.correction_reason,'proposed_evidence_text',r.proposed_evidence_text,
    'proposed_source_reference',r.proposed_source_reference,'status',r.status,'reviewed_at',r.reviewed_at,
    'review_notes',r.review_notes,'created_at',r.created_at) order by r.created_at desc)
    from public.staff_task_evidence_correction_requests r where r.clinic_id=e.clinic_id and r.evidence_id=e.id and r.requested_by_staff_profile_id=v_profile),'[]'::jsonb),
   'approved_corrections',coalesce((select jsonb_agg(jsonb_build_object(
    'correction_id',c.id,'corrected_evidence_text',c.corrected_evidence_text,
    'corrected_source_reference',c.corrected_source_reference,'reason',c.correction_reason,
    'approved_at',c.approved_at,'approved_by_user_id',c.approved_by_user_id) order by c.approved_at desc)
    from public.staff_task_evidence_corrections c where c.clinic_id=e.clinic_id and c.evidence_id=e.id and c.requested_by_staff_profile_id=v_profile),'[]'::jsonb)
  ) item
  from public.staff_task_evidence e join public.staff_tasks t on t.id=e.task_id and t.clinic_id=e.clinic_id
  where e.clinic_id=p_clinic_id and e.submitted_by_staff_profile_id=v_profile
  order by e.captured_at desc limit 200
 ) x;
 return jsonb_build_object('evidence',v_rows,'generated_at',now());
end;
$function$;
revoke all on function public.get_my_staff_task_evidence_correction_history(uuid) from public,anon;
grant execute on function public.get_my_staff_task_evidence_correction_history(uuid) to authenticated;
