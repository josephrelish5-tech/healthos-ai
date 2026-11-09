-- Read-only register for corrective actions and independent closure status.
create or replace function public.get_hospital_investigation_corrective_action_register(
  p_clinic_id uuid,
  p_alert_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_alert public.staff_task_evidence_file_tamper_alerts%rowtype;
  v_actions jsonb := '[]'::jsonb;
  v_latest_closure jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_alert_id is null then raise exception 'Hospital and alert are required' using errcode = '22023'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may view corrective-action registers' using errcode = '42501';
  end if;
  select a.* into v_alert from public.staff_task_evidence_file_tamper_alerts a
  where a.id = p_alert_id and a.clinic_id = p_clinic_id;
  if not found then raise exception 'Investigation alert not found' using errcode = 'P0002'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'action_id',c.id,'description',c.action_description,'status',c.action_status,
    'assigned_to_staff_profile_id',c.assigned_to_staff_profile_id,
    'assigned_to_name',sp.full_name,'due_date',c.due_date,
    'completion_note',c.completion_note,'created_at',c.created_at,
    'completed_at',c.completed_at
  ) order by c.created_at,c.id),'[]'::jsonb)
  into v_actions
  from public.staff_task_investigation_corrective_actions c
  left join public.staff_profiles sp on sp.id = c.assigned_to_staff_profile_id and sp.clinic_id = c.clinic_id
  where c.clinic_id = p_clinic_id and c.alert_id = p_alert_id;

  select jsonb_build_object(
    'verification_id',cv.id,'outcome',cv.verification_outcome,
    'findings_summary',cv.findings_summary,'verified_at',cv.verified_at,
    'verified_by_name',sp.full_name,'corrective_actions_reviewed',cv.corrective_actions_reviewed
  ) into v_latest_closure
  from public.staff_task_investigation_closure_verifications cv
  left join public.staff_profiles sp on sp.id = cv.verified_by_staff_profile_id and sp.clinic_id = cv.clinic_id
  where cv.clinic_id = p_clinic_id and cv.alert_id = p_alert_id
  order by cv.verified_at desc,cv.id desc limit 1;

  return jsonb_build_object(
    'read_only',true,'clinic_id',p_clinic_id,'alert_id',p_alert_id,
    'corrective_actions',v_actions,'latest_closure_verification',v_latest_closure,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.get_hospital_investigation_corrective_action_register(uuid,uuid) from public,anon;
grant execute on function public.get_hospital_investigation_corrective_action_register(uuid,uuid) to authenticated;
