-- Stage 5D Part 2I: read-only accountability escalation and exception queue.
-- Identifies overdue work, delayed reviews, repeated correction returns and integrity exceptions.
-- No notification, task mutation, approval, or automatic disciplinary action is performed.

create or replace function public.get_department_task_escalations(
  p_clinic_id uuid,
  p_department_id uuid,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_summary jsonb;
  v_escalations jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_department_id is null then
    raise exception 'Clinic and department are required' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Escalation limit must be between 1 and 500' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_uid
      and cm.status = 'active'
      and cm.role in ('owner','admin')
  ) into v_is_admin;

  if not v_is_admin and not exists (
    select 1
    from public.clinic_memberships cm
    join public.staff_profiles sp
      on sp.clinic_id = cm.clinic_id
     and sp.user_id = cm.user_id
     and sp.employment_status = 'active'
    join public.staff_department_assignments sda
      on sda.clinic_id = sp.clinic_id
     and sda.staff_profile_id = sp.id
     and sda.assignment_status = 'active'
     and sda.effective_from <= current_date
     and (sda.effective_to is null or sda.effective_to >= current_date)
    join public.clinic_management_assignments ma
      on ma.clinic_id = sda.clinic_id
     and ma.manager_assignment_id = sda.id
     and ma.department_id = p_department_id
     and ma.assignment_status in ('active','delegated')
     and ma.effective_from <= current_date
     and (ma.effective_to is null or ma.effective_to >= current_date)
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_uid
      and cm.status = 'active'
  ) then
    raise exception 'Appointed department management access required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.clinic_departments d
    where d.id = p_department_id
      and d.clinic_id = p_clinic_id
      and d.is_active
  ) then
    raise exception 'Active department not found' using errcode = 'P0002';
  end if;

  with scoped as (
    select
      t.id, t.task_title, t.task_status, t.priority, t.due_at, t.created_at,
      t.department_id, t.unit_id, t.requires_evidence, t.requires_supervisor_review,
      t.requires_separate_approval, t.review_status, t.reviewed_by_staff_profile_id,
      t.reviewed_at, t.completed_at, t.assigned_by_staff_profile_id,
      t.duty_id, t.duty_snapshot, t.duty_snapshot_source,
      a.id as assignment_id, a.staff_profile_id as assignee_profile_id,
      a.department_id as assignment_department_id, a.unit_id as assignment_unit_id,
      assignee.full_name as assignee_name,
      coalesce(ev.evidence_count,0) as evidence_count,
      coalesce(ev.assignee_evidence_count,0) as assignee_evidence_count,
      coalesce(evt.assignment_event_count,0) as assignment_event_count,
      evt.submitted_at,
      coalesce(evt.correction_count,0) as correction_count
    from public.staff_tasks t
    left join public.staff_department_assignments a
      on a.id = t.assigned_to_assignment_id and a.clinic_id = t.clinic_id
    left join public.staff_profiles assignee
      on assignee.id = a.staff_profile_id and assignee.clinic_id = a.clinic_id
    left join lateral (
      select count(*)::integer as evidence_count,
        count(*) filter (where e.submitted_by_staff_profile_id = a.staff_profile_id)::integer as assignee_evidence_count
      from public.staff_task_evidence e
      where e.clinic_id = t.clinic_id and e.task_id = t.id
    ) ev on true
    left join lateral (
      select
        count(*) filter (where e.event_type = 'assigned')::integer as assignment_event_count,
        max(e.created_at) filter (where e.event_type = 'submitted') as submitted_at,
        count(*) filter (where e.event_type in ('review_rejected','changes_requested'))::integer as correction_count
      from public.staff_task_events e
      where e.clinic_id = t.clinic_id and e.task_id = t.id
    ) evt on true
    where t.clinic_id = p_clinic_id
      and t.department_id = p_department_id
  ),
  assessed as (
    select s.*,
      (s.task_status not in ('completed','cancelled')
        and s.due_at is not null and s.due_at < now()) as is_overdue,
      (s.task_status = 'submitted'
        and s.submitted_at is not null
        and s.submitted_at < now() - interval '24 hours') as is_review_overdue,
      (s.correction_count >= 2) as has_repeated_corrections,
      (s.requires_evidence and s.task_status in ('submitted','completed')
        and s.assignee_evidence_count = 0) as has_missing_evidence,
      (s.task_status = 'completed' and s.requires_supervisor_review
        and (s.review_status is distinct from 'approved'
          or s.reviewed_by_staff_profile_id is null or s.reviewed_at is null)) as has_approval_exception,
      (s.task_status = 'completed' and s.requires_separate_approval
        and (s.reviewed_by_staff_profile_id is null
          or s.reviewed_by_staff_profile_id = s.assignee_profile_id
          or s.reviewed_by_staff_profile_id = s.assigned_by_staff_profile_id)) as has_separate_approval_conflict,
      (s.assignment_id is null
        or (s.assignment_id is not null and
          (s.assignment_department_id is distinct from s.department_id
            or s.assignment_unit_id is distinct from s.unit_id))
        or (s.task_status in ('submitted','completed') and s.assignment_event_count=0)
        or (s.duty_id is not null and s.duty_snapshot is null)
      ) as has_missing_accountability
    from scoped s
  ),
  flagged as (
    select a.*,
      array_remove(array[
        case when is_overdue then 'task_past_due' end,
        case when is_review_overdue then 'supervisor_review_waiting_over_24_hours' end,
        case when has_repeated_corrections then 'returned_for_correction_at_least_twice' end,
        case when has_missing_evidence then 'required_assignee_evidence_missing' end,
        case when has_approval_exception then 'completed_without_valid_supervisor_approval' end,
        case when has_separate_approval_conflict then 'independent_approval_separation_conflict' end,
        case when has_missing_accountability then 'missing_or_mismatched_accountability_record' end
      ], null) as conditions
    from assessed a
  ),
  routed as (
    select f.*,
      case
        when has_approval_exception or has_separate_approval_conflict then 'hospital_administration'
        when has_missing_accountability or has_missing_evidence then 'department_management'
        when is_review_overdue or has_repeated_corrections then 'department_management'
        else 'direct_supervisor'
      end as recommended_recipient,
      case
        when has_approval_exception or has_separate_approval_conflict then 'Critical control or approval exception; independent hospital-level review recommended.'
        when has_missing_accountability or has_missing_evidence then 'Required accountability evidence is incomplete; department management should investigate and assign corrective action.'
        when is_review_overdue then 'Submitted work has remained in the review queue for more than 24 hours.'
        when has_repeated_corrections then 'Two or more review returns were recorded; management should assess recurring blockers.'
        else 'Task is past its recorded due date; direct supervisor should review and update the work plan.'
      end as escalation_reason,
      case
        when has_approval_exception or has_separate_approval_conflict then 'critical'
        when has_missing_accountability or has_missing_evidence or is_review_overdue then 'high'
        when is_overdue or has_repeated_corrections then 'medium'
        else 'low'
      end as severity,
      case when submitted_at is null then null
        else round((extract(epoch from (now()-submitted_at))/3600.0)::numeric,1) end as review_wait_hours
    from flagged f
    where cardinality(conditions) > 0
  ),
  limited as (
    select * from routed
    order by case severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
      due_at asc nulls last, created_at asc
    limit p_limit
  )
  select
    jsonb_build_object(
      'tasks_assessed', count(*),
      'tasks_with_escalations', count(*) filter (where cardinality(conditions)>0),
      'overdue_tasks', count(*) filter (where is_overdue),
      'review_overdue', count(*) filter (where is_review_overdue),
      'repeated_corrections', count(*) filter (where has_repeated_corrections),
      'missing_required_evidence', count(*) filter (where has_missing_evidence),
      'approval_exceptions', count(*) filter (where has_approval_exception or has_separate_approval_conflict),
      'missing_accountability_records', count(*) filter (where has_missing_accountability),
      'escalations_returned', (select count(*) from limited)
    ),
    coalesce((select jsonb_agg(jsonb_build_object(
      'task_id', l.id,
      'task_title', l.task_title,
      'task_status', l.task_status,
      'priority', l.priority,
      'assignee_name', l.assignee_name,
      'due_at', l.due_at,
      'severity', l.severity,
      'conditions', to_jsonb(l.conditions),
      'recommended_recipient', l.recommended_recipient,
      'escalation_reason', l.escalation_reason,
      'correction_count', l.correction_count,
      'review_wait_hours', l.review_wait_hours
    ) order by case l.severity when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
      l.due_at asc nulls last, l.created_at asc) from limited l), '[]'::jsonb)
  into v_summary, v_escalations
  from assessed a;

  return jsonb_build_object(
    'read_only', true,
    'scope', 'appointed_department_or_hospital_admin',
    'clinic_id', p_clinic_id,
    'department_id', p_department_id,
    'generated_at', now(),
    'thresholds', jsonb_build_object(
      'overdue_task', 'due_at is before current time and status is not completed or cancelled',
      'review_overdue_hours', 24,
      'repeated_corrections', 2,
      'evidence', 'requires_evidence=true and task is submitted or completed but no evidence submitted by assignee'
    ),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'escalations', coalesce(v_escalations, '[]'::jsonb),
    'limit', p_limit
  );
end;
$function$;

revoke all on function public.get_department_task_escalations(uuid,uuid,integer) from public, anon;
grant execute on function public.get_department_task_escalations(uuid,uuid,integer) to authenticated;
