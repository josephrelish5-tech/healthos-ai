-- Stage 5D Part 2O-A: secure, read-only hospital accountability investigation dossier.
-- Exposes a task-scoped reconstruction to hospital administrators and currently appointed
-- department/unit managers only. Never returns evidence text, storage paths, patient details,
-- or raw event metadata. Depends on Parts 2B, 2H and 2J being applied first.

create or replace function public.get_hospital_accountability_investigation_dossier(
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
  v_dossier jsonb;
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
  where t.id = p_task_id
    and t.clinic_id = p_clinic_id;

  if not found then
    raise exception 'Task not found in this hospital' using errcode = 'P0002';
  end if;

  select a.* into v_assignment
  from public.staff_department_assignments a
  where a.id = v_task.assigned_to_assignment_id
    and a.clinic_id = p_clinic_id;

  -- Investigation dossier is intentionally narrower than the ordinary task chain:
  -- only hospital owner/admin or current appointed manager for this department/unit.
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

  select jsonb_build_object(
    'read_only', true,
    'dossier_type', 'hospital_accountability_investigation',
    'generated_at', now(),
    'scope', case when v_role in ('owner','admin') then 'hospital_administrator' else 'appointed_department_or_unit_manager' end,
    'task', jsonb_build_object(
      'task_id', v_task.id,
      'clinic_id', v_task.clinic_id,
      'department_id', v_task.department_id,
      'unit_id', v_task.unit_id,
      'title', v_task.task_title,
      'status', v_task.task_status,
      'priority', v_task.priority,
      'due_at', v_task.due_at,
      'created_at', v_task.created_at,
      'updated_at', v_task.updated_at,
      'accepted_at', v_task.accepted_at,
      'started_at', v_task.started_at,
      'completed_at', v_task.completed_at,
      'review_status', v_task.review_status,
      'reviewed_at', v_task.reviewed_at,
      'requires_evidence', v_task.requires_evidence,
      'requires_supervisor_review', v_task.requires_supervisor_review,
      'requires_separate_approval', v_task.requires_separate_approval,
      'duty_id', v_task.duty_id,
      'duty_snapshot', v_task.duty_snapshot,
      'duty_snapshot_captured_at', v_task.duty_snapshot_captured_at,
      'duty_snapshot_source', v_task.duty_snapshot_source
    ),
    'people', jsonb_build_object(
      'assignee', (select case when sp.id is null then null else jsonb_build_object(
        'staff_profile_id', sp.id, 'name', sp.full_name, 'staff_id', sp.staff_id,
        'professional_role', sp.professional_role
      ) end
      from public.staff_profiles sp
      where sp.id = v_assignment.staff_profile_id and sp.clinic_id = p_clinic_id),
      'assigning_supervisor', (select case when sp.id is null then null else jsonb_build_object(
        'staff_profile_id', sp.id, 'name', sp.full_name, 'staff_id', sp.staff_id
      ) end
      from public.staff_profiles sp
      where sp.id = v_task.assigned_by_staff_profile_id and sp.clinic_id = p_clinic_id),
      'requester', (select case when sp.id is null then null else jsonb_build_object(
        'staff_profile_id', sp.id, 'name', sp.full_name, 'staff_id', sp.staff_id
      ) end
      from public.staff_profiles sp
      where sp.id = v_task.requested_by_staff_profile_id and sp.clinic_id = p_clinic_id),
      'direct_supervisor', (select case when sp.id is null then null else jsonb_build_object(
        'staff_profile_id', sp.id, 'name', sp.full_name, 'staff_id', sp.staff_id
      ) end
      from public.staff_profiles sp
      where sp.id = v_assignment.supervisor_staff_profile_id and sp.clinic_id = p_clinic_id),
      'reviewer', (select case when sp.id is null then null else jsonb_build_object(
        'staff_profile_id', sp.id, 'name', sp.full_name, 'staff_id', sp.staff_id
      ) end
      from public.staff_profiles sp
      where sp.id = v_task.reviewed_by_staff_profile_id and sp.clinic_id = p_clinic_id)
    ),
    'task_timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_id', e.id,
        'event_type', e.event_type,
        'from_status', e.from_status,
        'to_status', e.to_status,
        'actor_staff_profile_id', e.actor_staff_profile_id,
        'actor_name', actor.full_name,
        'occurred_at', e.created_at
      ) order by e.created_at, e.id)
      from public.staff_task_events e
      left join public.staff_profiles actor
        on actor.id = e.actor_staff_profile_id and actor.clinic_id = e.clinic_id
      where e.clinic_id = p_clinic_id and e.task_id = p_task_id
    ), '[]'::jsonb),
    'evidence_register', coalesce((
      select jsonb_agg(jsonb_build_object(
        'evidence_id', ev.id,
        'evidence_type', ev.evidence_type,
        'submitted_by_staff_profile_id', ev.submitted_by_staff_profile_id,
        'submitted_by_name', submitter.full_name,
        'captured_at', ev.captured_at,
        'created_at', ev.created_at,
        'has_uploaded_file', ev.storage_path is not null,
        'has_text_entry', nullif(trim(coalesce(ev.evidence_text,'')), '') is not null,
        'has_source_reference', nullif(trim(coalesce(ev.source_reference,'')), '') is not null
      ) order by ev.created_at, ev.id)
      from public.staff_task_evidence ev
      left join public.staff_profiles submitter
        on submitter.id = ev.submitted_by_staff_profile_id and submitter.clinic_id = ev.clinic_id
      where ev.clinic_id = p_clinic_id and ev.task_id = p_task_id
    ), '[]'::jsonb),
    'escalations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'escalation_id', x.id,
        'severity', x.severity,
        'source', x.source,
        'escalation_level', x.escalation_level,
        'status', x.status,
        'reason', x.reason,
        'raised_by_user_id', x.raised_by_user_id,
        'raised_by_name', raiser.full_name,
        'acknowledged_by_user_id', x.acknowledged_by_user_id,
        'acknowledged_at', x.acknowledged_at,
        'resolved_by_user_id', x.resolved_by_user_id,
        'resolved_at', x.resolved_at,
        'resolution_notes', x.resolution_notes,
        'created_at', x.created_at,
        'updated_at', x.updated_at
      ) order by x.created_at, x.id)
      from public.department_task_escalations x
      left join public.staff_profiles raiser
        on raiser.id = x.raised_by_staff_profile_id and raiser.clinic_id = x.clinic_id
      where x.clinic_id = p_clinic_id and x.task_id = p_task_id
    ), '[]'::jsonb),
    'escalation_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_id', ee.id,
        'escalation_id', ee.escalation_id,
        'action', ee.action_key,
        'actor_user_id', ee.actor_user_id,
        'occurred_at', ee.created_at
      ) order by ee.created_at, ee.id)
      from public.department_task_escalation_events ee
      join public.department_task_escalations x
        on x.id = ee.escalation_id and x.clinic_id = ee.clinic_id
      where ee.clinic_id = p_clinic_id and x.task_id = p_task_id
    ), '[]'::jsonb),
    'investigation_actions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action_id', a.id,
        'cycle_no', a.cycle_no,
        'action_type', a.action_type,
        'actor_user_id', a.actor_user_id,
        'actor_staff_profile_id', a.actor_staff_profile_id,
        'actor_name', actor.full_name,
        'action_notes', a.action_notes,
        'has_evidence_reference', nullif(trim(coalesce(a.evidence_reference,'')), '') is not null,
        'created_at', a.created_at
      ) order by a.cycle_no, a.created_at, a.id)
      from public.staff_task_escalation_actions a
      left join public.staff_profiles actor
        on actor.id = a.actor_staff_profile_id and actor.clinic_id = a.clinic_id
      where a.clinic_id = p_clinic_id and a.task_id = p_task_id
    ), '[]'::jsonb)
  ) into v_dossier;

  return v_dossier;
end;
$function$;

revoke all on function public.get_hospital_accountability_investigation_dossier(uuid,uuid) from public, anon;
grant execute on function public.get_hospital_accountability_investigation_dossier(uuid,uuid) to authenticated;

comment on function public.get_hospital_accountability_investigation_dossier(uuid,uuid) is
'Read-only, task-scoped investigation dossier for active hospital owners/admins and currently appointed department/unit managers. Returns duty snapshot, task timeline, evidence metadata, escalation and follow-up history. Never returns evidence text, storage paths, or raw event metadata.';
