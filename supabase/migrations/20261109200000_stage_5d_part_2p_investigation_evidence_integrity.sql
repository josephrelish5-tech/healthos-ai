-- Stage 5D Part 2P: Hospital Investigation Audit & Evidence Integrity.
-- Read-only metadata/accountability checks over the existing Part 2O investigation dossier.
-- Does not change tasks, evidence, approvals, results, or workflow state.
-- Does not claim cryptographic proof of uploaded-file contents.

create or replace function public.get_hospital_investigation_evidence_integrity_audit(
  p_clinic_id uuid,
  p_task_id uuid
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
  v_profile_id uuid;
  v_task public.staff_tasks%rowtype;
  v_assignment public.staff_department_assignments%rowtype;
  v_evidence_count integer := 0;
  v_missing_submitter integer := 0;
  v_missing_payload integer := 0;
  v_bad_timestamp integer := 0;
  v_assignment_events integer := 0;
  v_submission_events integer := 0;
  v_flags text[] := array[]::text[];
  v_evidence jsonb := '[]'::jsonb;
  v_summary jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_task_id is null then
    raise exception 'Clinic and task are required' using errcode = '22023';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id
    and cm.user_id = v_uid
    and cm.status = 'active'
  limit 1;

  if v_role is null then
    raise exception 'Active hospital membership required' using errcode = '42501';
  end if;

  select sp.id into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id
    and sp.user_id = v_uid
    and sp.employment_status = 'active'
  limit 1;

  select t.* into v_task
  from public.staff_tasks t
  where t.id = p_task_id and t.clinic_id = p_clinic_id;

  if not found then
    raise exception 'Task not found in this hospital' using errcode = 'P0002';
  end if;

  select a.* into v_assignment
  from public.staff_department_assignments a
  where a.id = v_task.assigned_to_assignment_id
    and a.clinic_id = p_clinic_id;

  -- Same narrow access boundary as the Part 2O dossier.
  if v_role not in ('owner','admin') then
    if v_profile_id is null or not exists (
      select 1
      from public.staff_department_assignments manager_assignment
      join public.clinic_management_assignments ma
        on ma.clinic_id = manager_assignment.clinic_id
       and ma.manager_assignment_id = manager_assignment.id
      where manager_assignment.clinic_id = p_clinic_id
        and manager_assignment.staff_profile_id = v_profile_id
        and manager_assignment.assignment_status = 'active'
        and manager_assignment.effective_from <= current_date
        and (manager_assignment.effective_to is null or manager_assignment.effective_to >= current_date)
        and ma.department_id = v_task.department_id
        and (ma.unit_id is null or ma.unit_id = v_task.unit_id)
        and ma.assignment_status in ('active','delegated')
        and ma.effective_from <= current_date
        and (ma.effective_to is null or ma.effective_to >= current_date)
    ) then
      raise exception 'Hospital administrator or currently appointed department/unit manager access required'
        using errcode = '42501';
    end if;
  end if;

  select
    count(*)::integer,
    count(*) filter (where ev.submitted_by_staff_profile_id is null or submitter.id is null)::integer,
    count(*) filter (
      where ev.storage_path is null
        and nullif(trim(coalesce(ev.evidence_text,'')), '') is null
        and nullif(trim(coalesce(ev.source_reference,'')), '') is null
    )::integer,
    count(*) filter (where ev.captured_at > ev.created_at + interval '5 minutes')::integer
  into v_evidence_count, v_missing_submitter, v_missing_payload, v_bad_timestamp
  from public.staff_task_evidence ev
  left join public.staff_profiles submitter
    on submitter.id = ev.submitted_by_staff_profile_id
   and submitter.clinic_id = ev.clinic_id
  where ev.clinic_id = p_clinic_id and ev.task_id = p_task_id;

  select count(*) filter (where e.event_type = 'assigned')::integer,
         count(*) filter (where e.event_type = 'submitted')::integer
  into v_assignment_events, v_submission_events
  from public.staff_task_events e
  where e.clinic_id = p_clinic_id and e.task_id = p_task_id;

  if v_task.assigned_to_assignment_id is null or v_assignment.id is null then
    v_flags := array_append(v_flags, 'missing_or_unresolvable_staff_assignment');
  elsif v_assignment.department_id is distinct from v_task.department_id
     or v_assignment.unit_id is distinct from v_task.unit_id then
    v_flags := array_append(v_flags, 'staff_assignment_department_or_unit_mismatch');
  end if;

  if v_task.duty_id is not null and v_task.duty_snapshot is null then
    v_flags := array_append(v_flags, 'missing_assignment_time_duty_snapshot');
  end if;
  if v_task.duty_snapshot is not null
     and v_task.duty_snapshot->>'duty_id' is distinct from v_task.duty_id::text then
    v_flags := array_append(v_flags, 'duty_snapshot_reference_mismatch');
  end if;

  if v_task.requires_evidence and v_task.task_status in ('submitted','completed') and v_evidence_count = 0 then
    v_flags := array_append(v_flags, 'required_evidence_missing');
  end if;
  if v_missing_submitter > 0 then
    v_flags := array_append(v_flags, 'evidence_submitter_missing_or_unmatched');
  end if;
  if v_missing_payload > 0 then
    v_flags := array_append(v_flags, 'evidence_record_has_no_file_text_or_source_reference');
  end if;
  if v_bad_timestamp > 0 then
    v_flags := array_append(v_flags, 'evidence_capture_timestamp_after_record_timestamp');
  end if;
  if v_assignment_events = 0 and v_task.task_status not in ('assigned','cancelled') then
    v_flags := array_append(v_flags, 'assignment_event_not_found');
  end if;
  if v_task.task_status in ('submitted','completed') and v_submission_events = 0 then
    v_flags := array_append(v_flags, 'submission_event_not_found');
  end if;
  if v_task.task_status = 'completed' and v_task.completed_at is null then
    v_flags := array_append(v_flags, 'completed_task_missing_completion_timestamp');
  end if;
  if v_task.task_status = 'completed'
     and v_task.requires_supervisor_review
     and (v_task.reviewed_by_staff_profile_id is null
       or v_task.reviewed_at is null
       or v_task.review_status is distinct from 'approved') then
    v_flags := array_append(v_flags, 'required_supervisor_approval_incomplete');
  end if;
  if v_task.task_status = 'completed'
     and v_task.requires_separate_approval
     and (v_task.reviewed_by_staff_profile_id is null
       or v_task.reviewed_by_staff_profile_id = v_assignment.staff_profile_id
       or v_task.reviewed_by_staff_profile_id = v_task.assigned_by_staff_profile_id) then
    v_flags := array_append(v_flags, 'independent_approval_separation_conflict');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'evidence_id', ev.id,
    'evidence_type', ev.evidence_type,
    'submitted_by_name', submitter.full_name,
    'created_at', ev.created_at,
    'captured_at', ev.captured_at,
    'submitter_verified', (ev.submitted_by_staff_profile_id is not null and submitter.id is not null),
    'has_uploaded_file', ev.storage_path is not null,
    'has_text_entry', nullif(trim(coalesce(ev.evidence_text,'')), '') is not null,
    'has_source_reference', nullif(trim(coalesce(ev.source_reference,'')), '') is not null,
    'has_payload_or_reference', (
      ev.storage_path is not null
      or nullif(trim(coalesce(ev.evidence_text,'')), '') is not null
      or nullif(trim(coalesce(ev.source_reference,'')), '') is not null
    ),
    'timestamp_order_valid', ev.captured_at <= ev.created_at + interval '5 minutes'
  ) order by ev.created_at, ev.id), '[]'::jsonb)
  into v_evidence
  from public.staff_task_evidence ev
  left join public.staff_profiles submitter
    on submitter.id = ev.submitted_by_staff_profile_id
   and submitter.clinic_id = ev.clinic_id
  where ev.clinic_id = p_clinic_id and ev.task_id = p_task_id;

  v_summary := jsonb_build_object(
    'evidence_records_reviewed', v_evidence_count,
    'finding_count', cardinality(v_flags),
    'accountability_findings', (
      select count(*) from unnest(v_flags) f
      where f like '%assignment%' or f like '%approval%' or f like '%submission%' or f like '%snapshot%'
    ),
    'evidence_submitter_mismatches', v_missing_submitter,
    'evidence_without_payload_or_reference', v_missing_payload,
    'evidence_timestamp_anomalies', v_bad_timestamp,
    'assignment_events', v_assignment_events,
    'submission_events', v_submission_events
  );

  return jsonb_build_object(
    'read_only', true,
    'audit_type', 'hospital_investigation_evidence_integrity',
    'clinic_id', p_clinic_id,
    'task_id', p_task_id,
    'generated_at', now(),
    'scope', case when v_role in ('owner','admin') then 'hospital_administrator' else 'appointed_department_or_unit_manager' end,
    'summary', v_summary,
    'findings', to_jsonb(v_flags),
    'evidence_register', v_evidence,
    'limitations', jsonb_build_array(
      'Checks validate database metadata and accountability links only.',
      'Uploaded file contents are not cryptographically hashed or re-verified by this audit.',
      'A present file path or reference does not prove that evidence is clinically sufficient or authentic.'
    )
  );
end;
$function$;

revoke all on function public.get_hospital_investigation_evidence_integrity_audit(uuid,uuid) from public, anon;
grant execute on function public.get_hospital_investigation_evidence_integrity_audit(uuid,uuid) to authenticated;

comment on function public.get_hospital_investigation_evidence_integrity_audit(uuid,uuid) is
'Read-only, clinic/task-scoped investigation evidence metadata and accountability audit for hospital owners/admins and currently appointed department/unit managers. Does not expose evidence text or storage paths and does not claim cryptographic file integrity.';
