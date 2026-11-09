-- Stage 5D Part 2D: correct department-wide audit totals while keeping the findings page capped.
-- Additive function replacement only; preserves all authorization and read-only checks.
-- Does not mutate task records, evidence, approvals, or existing workflows.

create or replace function public.get_department_task_integrity_audit(
  p_clinic_id uuid,
  p_department_id uuid,
  p_limit integer default 200
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
  v_findings jsonb;
  v_summary jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_department_id is null then
    raise exception 'Clinic and department are required' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Audit limit must be between 1 and 500' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.clinic_memberships cm
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
    raise exception 'Department management appointment required' using errcode = '42501';
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
      t.id,
      t.task_title,
      t.task_status,
      t.priority,
      t.created_at,
      t.due_at,
      t.department_id,
      t.unit_id,
      t.duty_id,
      t.duty_snapshot,
      t.duty_snapshot_source,
      t.duty_snapshot_captured_at,
      t.assigned_to_assignment_id,
      t.assigned_by_staff_profile_id,
      t.reviewed_by_staff_profile_id,
      t.reviewed_at,
      t.review_status,
      t.completed_at,
      t.requires_evidence,
      t.requires_supervisor_review,
      t.requires_separate_approval,
      a.id as assignment_id,
      a.staff_profile_id as assignee_profile_id,
      a.department_id as assignment_department_id,
      a.unit_id as assignment_unit_id,
      assignee.full_name as assignee_name,
      jd.id as live_duty_id,
      jd.validation_status as live_duty_validation_status,
      jd.is_active as live_duty_is_active,
      dr.department_id as live_duty_department_id,
      coalesce(ev.evidence_count,0) as evidence_count,
      coalesce(evt.assignment_event_count,0) as assignment_event_count
    from public.staff_tasks t
    left join public.staff_department_assignments a
      on a.id = t.assigned_to_assignment_id
      and a.clinic_id = t.clinic_id
    left join public.staff_profiles assignee
      on assignee.id = a.staff_profile_id
      and assignee.clinic_id = a.clinic_id
    left join public.clinic_job_duties jd
      on jd.id = t.duty_id
      and jd.clinic_id = t.clinic_id
    left join public.clinic_job_profiles jp
      on jp.id = jd.job_profile_id
      and jp.clinic_id = jd.clinic_id
    left join public.clinic_department_roles dr
      on dr.id = jp.department_role_id
      and dr.clinic_id = jp.clinic_id
    left join lateral (
      select count(*)::integer as evidence_count
      from public.staff_task_evidence e
      where e.clinic_id = t.clinic_id
        and e.task_id = t.id
    ) ev on true
    left join lateral (
      select count(*)::integer as assignment_event_count
      from public.staff_task_events e
      where e.clinic_id = t.clinic_id
        and e.task_id = t.id
        and e.event_type = 'assigned'
    ) evt on true
    where t.clinic_id = p_clinic_id
      and t.department_id = p_department_id
  ),
  assessed as (
    select s.*,
      array_remove(array[
        case when s.assignment_id is null then 'missing_staff_assignment' end,
        case when s.assignment_id is not null
          and (s.assignment_department_id is distinct from s.department_id
            or s.assignment_unit_id is distinct from s.unit_id)
          then 'staff_assignment_scope_mismatch' end,
        case when s.duty_id is not null and s.duty_snapshot is null
          then 'missing_duty_snapshot' end,
        case when s.duty_snapshot is not null
          and s.duty_snapshot->>'duty_id' is distinct from s.duty_id::text
          then 'duty_snapshot_link_mismatch' end,
        case when s.duty_snapshot is not null
          and s.duty_snapshot->>'department_id' is not null
          and s.duty_snapshot->>'department_id' <> s.department_id::text
          then 'snapshot_department_mismatch' end,
        case when s.duty_id is not null and s.live_duty_id is null
          and s.duty_snapshot is null
          then 'duty_reference_and_snapshot_missing' end,
        case when s.duty_id is not null
          and s.live_duty_department_id is not null
          and s.live_duty_department_id <> s.department_id
          then 'current_duty_department_mismatch' end,
        case when s.requires_evidence
          and s.task_status in ('submitted','completed')
          and s.evidence_count = 0
          then 'required_evidence_missing' end,
        case when s.task_status in ('submitted','completed')
          and s.assignment_event_count = 0
          then 'assignment_event_missing' end,
        case when s.task_status = 'completed'
          and s.completed_at is null
          then 'completion_timestamp_missing' end,
        case when s.task_status = 'completed'
          and s.requires_supervisor_review
          and (s.reviewed_by_staff_profile_id is null
            or s.reviewed_at is null
            or s.review_status is distinct from 'approved')
          then 'supervisor_approval_incomplete' end,
        case when s.task_status = 'completed'
          and s.review_status is distinct from 'approved'
          then 'completion_without_approved_review' end,
        case when s.task_status = 'completed'
          and s.requires_separate_approval
          and (s.reviewed_by_staff_profile_id is null
            or s.reviewed_by_staff_profile_id = s.assignee_profile_id
            or s.reviewed_by_staff_profile_id = s.assigned_by_staff_profile_id)
          then 'separate_approval_conflict' end,
        case when s.duty_snapshot_source = 'backfilled_current_state'
          then 'legacy_snapshot_not_assignment_time_proof' end
      ], null) as flags
    from scoped s
  ),
  limited as (
    select * from assessed
    order by
      case when cardinality(flags) > 0 then 0 else 1 end,
      created_at desc
    limit p_limit
  )
  -- Findings are capped for a manageable dashboard response.
  select coalesce(jsonb_agg(jsonb_build_object(
      'task_id', l.id,
      'task_title', l.task_title,
      'task_status', l.task_status,
      'priority', l.priority,
      'created_at', l.created_at,
      'due_at', l.due_at,
      'assignee_profile_id', l.assignee_profile_id,
      'assignee_name', l.assignee_name,
      'assigned_to_assignment_id', l.assigned_to_assignment_id,
      'assigned_by_staff_profile_id', l.assigned_by_staff_profile_id,
      'reviewed_by_staff_profile_id', l.reviewed_by_staff_profile_id,
      'reviewed_at', l.reviewed_at,
      'review_status', l.review_status,
      'completed_at', l.completed_at,
      'duty_id', l.duty_id,
      'duty_snapshot_source', l.duty_snapshot_source,
      'duty_snapshot_captured_at', l.duty_snapshot_captured_at,
      'duty_snapshot', l.duty_snapshot,
      'current_duty_validation_status', l.live_duty_validation_status,
      'current_duty_is_active', l.live_duty_is_active,
      'evidence_count', l.evidence_count,
      'assignment_event_count', l.assignment_event_count,
      'integrity_status', case when cardinality(l.flags)=0 then 'clear' else 'attention_required' end,
      'findings', to_jsonb(l.flags)
    ) order by
      case when cardinality(l.flags)>0 then 0 else 1 end,
      l.created_at desc), '[]'::jsonb)
  into v_findings
  from limited l;

  -- Summary counts cover every task in the department, not just the displayed findings page.
  select jsonb_build_object(
      'records_reviewed', count(*),
      'records_with_findings', count(*) filter (where cardinality(a.flags)>0),
      'records_clear', count(*) filter (where cardinality(a.flags)=0),
      'missing_assignment', count(*) filter (where 'missing_staff_assignment'=any(a.flags)),
      'assignment_scope_mismatch', count(*) filter (where 'staff_assignment_scope_mismatch'=any(a.flags)),
      'missing_duty_snapshot', count(*) filter (where 'missing_duty_snapshot'=any(a.flags)),
      'missing_required_evidence', count(*) filter (where 'required_evidence_missing'=any(a.flags)),
      'missing_assignment_event', count(*) filter (where 'assignment_event_missing'=any(a.flags)),
      'completion_without_valid_approval', count(*) filter (where 'completion_without_approved_review'=any(a.flags)),
      'legacy_backfilled_snapshots', count(*) filter (where 'legacy_snapshot_not_assignment_time_proof'=any(a.flags)),
      'findings_returned', (select count(*) from limited)
    )
  into v_summary
  from assessed a;

  return jsonb_build_object(
    'department_id', p_department_id,
    'generated_at', now(),
    'read_only', true,
    'scope', case when v_is_admin then 'hospital_wide_admin' else 'appointed_department_manager' end,
    'summary', coalesce(v_summary, '{}'::jsonb),
    'findings', coalesce(v_findings, '[]'::jsonb),
    'limit', p_limit
  );
end;
$function$;

revoke all on function public.get_department_task_integrity_audit(uuid,uuid,integer) from public, anon;
grant execute on function public.get_department_task_integrity_audit(uuid,uuid,integer) to authenticated;
