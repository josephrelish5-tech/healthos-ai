-- Stage 5D Part 2A: expose the existing approved-duty -> staff-assignment ->
-- execution -> evidence -> supervisor-review chain through existing read RPCs.
-- Additive only: no tables, columns, policies, task mutation rules, or existing
-- assignment/review workflows are replaced. Apply only after staging review.

create or replace function public.get_my_staff_tasks(p_clinic_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_tasks jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_clinic_id is null then raise exception 'Clinic is required'; end if;

  if not exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id and cm.user_id = v_user_id
      and cm.status = 'active' and cm.role not in ('owner','admin')
  ) then raise exception 'Active staff membership required'; end if;

  select sp.id into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_user_id
    and sp.employment_status = 'active'
  limit 1;

  if v_profile_id is null then raise exception 'Active staff profile not found'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'task_title', t.task_title,
    'task_description', t.task_description,
    'priority', t.priority,
    'task_status', t.task_status,
    'due_at', t.due_at,
    'created_at', t.created_at,
    'accepted_at', t.accepted_at,
    'started_at', t.started_at,
    'completed_at', t.completed_at,
    'requires_evidence', t.requires_evidence,
    'requires_supervisor_review', t.requires_supervisor_review,
    'requires_separate_approval', t.requires_separate_approval,
    'department_name', d.department_name,
    'unit_name', u.unit_name,
    'assigned_to_assignment_id', sda.id,
    'assigned_to_staff_profile_id', sda.staff_profile_id,
    'approved_duty', case when jd.id is null then null else jsonb_build_object(
      'id', jd.id,
      'assignment_snapshot', t.duty_snapshot,
      'snapshot_captured_at', t.duty_snapshot_captured_at,
      'snapshot_source', t.duty_snapshot_source,
      'code', jd.duty_code,
      'title', jd.duty_title,
      'description', jd.duty_description,
      'category', jd.duty_category,
      'current_validation_status', jd.validation_status,
      'currently_active', jd.is_active,
      'job_profile_id', jp.id,
      'job_title', jp.job_title,
      'job_profile_validation_status', jp.validation_status,
      'department_role_id', dr.id,
      'duty_department_id', dr.department_id,
      'duty_department_name', duty_department.department_name,
      'department_matches_task_department', dr.department_id = t.department_id
    ) end,
    'evidence_count', coalesce(ev.evidence_count, 0)
  ) order by
    case t.priority when 'urgent' then 1 when 'high' then 2
      when 'normal' then 3 else 4 end,
    t.due_at nulls last, t.created_at desc), '[]'::jsonb)
  into v_tasks
  from public.staff_tasks t
  join public.staff_department_assignments sda
    on sda.id = t.assigned_to_assignment_id and sda.clinic_id = t.clinic_id
  join public.clinic_departments d
    on d.id = t.department_id and d.clinic_id = t.clinic_id
  left join public.clinic_units u
    on u.id = t.unit_id and u.clinic_id = t.clinic_id
  left join public.clinic_job_duties jd
    on jd.id = t.duty_id and jd.clinic_id = t.clinic_id
  left join public.clinic_job_profiles jp
    on jp.id = jd.job_profile_id and jp.clinic_id = jd.clinic_id
  left join public.clinic_department_roles dr
    on dr.id = jp.department_role_id and dr.clinic_id = jp.clinic_id
  left join public.clinic_departments duty_department
    on duty_department.id = dr.department_id and duty_department.clinic_id = dr.clinic_id
  left join lateral (
    select count(*)::integer as evidence_count
    from public.staff_task_evidence e
    where e.clinic_id = t.clinic_id and e.task_id = t.id
  ) ev on true
  where t.clinic_id = p_clinic_id
    and sda.staff_profile_id = v_profile_id
    and sda.assignment_status = 'active'
    and sda.effective_from <= current_date
    and (sda.effective_to is null or sda.effective_to >= current_date)
    and t.task_status not in ('cancelled');

  return jsonb_build_object('tasks', coalesce(v_tasks, '[]'::jsonb));
end;
$function$;

revoke all on function public.get_my_staff_tasks(uuid) from public, anon;
grant execute on function public.get_my_staff_tasks(uuid) to authenticated;


create or replace function public.get_supervisor_task_reviews(p_clinic_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_role text;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_user_id
    and cm.status = 'active'
  limit 1;
  if v_role is null then raise exception 'Active hospital membership required'; end if;

  select sp.id into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_user_id
    and sp.employment_status = 'active'
  limit 1;
  if v_role not in ('owner','admin') and v_profile_id is null then
    raise exception 'Active staff profile required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'task_title', t.task_title,
    'task_description', t.task_description,
    'priority', t.priority,
    'task_status', t.task_status,
    'due_at', t.due_at,
    'submitted_at', t.updated_at,
    'requires_evidence', t.requires_evidence,
    'requires_separate_approval', t.requires_separate_approval,
    'review_status', t.review_status,
    'department_id', d.id,
    'department_name', d.department_name,
    'unit_name', u.unit_name,
    'assigned_to_assignment_id', a.id,
    'assignee_profile_id', a.staff_profile_id,
    'assignee_name', assignee.full_name,
    'assignee_staff_id', assignee.staff_id,
    'assigned_by_staff_profile_id', t.assigned_by_staff_profile_id,
    'assigned_by_name', assigner.full_name,
    'reviewed_by_staff_profile_id', t.reviewed_by_staff_profile_id,
    'reviewed_by_name', reviewer.full_name,
    'reviewed_at', t.reviewed_at,
    'review_notes', t.review_notes,
    'approved_duty', case when jd.id is null then null else jsonb_build_object(
      'id', jd.id,
      'assignment_snapshot', t.duty_snapshot,
      'snapshot_captured_at', t.duty_snapshot_captured_at,
      'snapshot_source', t.duty_snapshot_source,
      'code', jd.duty_code,
      'title', jd.duty_title,
      'description', jd.duty_description,
      'category', jd.duty_category,
      'current_validation_status', jd.validation_status,
      'currently_active', jd.is_active,
      'job_profile_id', jp.id,
      'job_title', jp.job_title,
      'job_profile_validation_status', jp.validation_status,
      'department_role_id', dr.id,
      'duty_department_id', dr.department_id,
      'duty_department_name', duty_department.department_name,
      'department_matches_task_department', dr.department_id = t.department_id
    ) end,
    'evidence', coalesce(ev.items, '[]'::jsonb),
    'events', coalesce(evt.items, '[]'::jsonb)
  ) order by t.updated_at), '[]'::jsonb)
  into v_result
  from public.staff_tasks t
  join public.clinic_departments d
    on d.id = t.department_id and d.clinic_id = t.clinic_id
  left join public.clinic_units u
    on u.id = t.unit_id and u.clinic_id = t.clinic_id
  join public.staff_department_assignments a
    on a.id = t.assigned_to_assignment_id and a.clinic_id = t.clinic_id
  join public.staff_profiles assignee
    on assignee.id = a.staff_profile_id and assignee.clinic_id = a.clinic_id
  left join public.staff_profiles assigner
    on assigner.id = t.assigned_by_staff_profile_id and assigner.clinic_id = t.clinic_id
  left join public.staff_profiles reviewer
    on reviewer.id = t.reviewed_by_staff_profile_id and reviewer.clinic_id = t.clinic_id
  left join public.clinic_job_duties jd
    on jd.id = t.duty_id and jd.clinic_id = t.clinic_id
  left join public.clinic_job_profiles jp
    on jp.id = jd.job_profile_id and jp.clinic_id = jd.clinic_id
  left join public.clinic_department_roles dr
    on dr.id = jp.department_role_id and dr.clinic_id = jp.clinic_id
  left join public.clinic_departments duty_department
    on duty_department.id = dr.department_id and duty_department.clinic_id = dr.clinic_id
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'type', e.evidence_type, 'text', e.evidence_text,
      'reference', e.source_reference, 'captured_at', e.captured_at,
      'submitted_by', es.full_name
    ) order by e.created_at) as items
    from public.staff_task_evidence e
    left join public.staff_profiles es
      on es.id = e.submitted_by_staff_profile_id and es.clinic_id = e.clinic_id
    where e.task_id = t.id and e.clinic_id = t.clinic_id
  ) ev on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'event_type', e.event_type,
      'from_status', e.from_status,
      'to_status', e.to_status,
      'event_notes', e.event_notes,
      'created_at', e.created_at,
      'actor_name', actor.full_name
    ) order by e.created_at) as items
    from public.staff_task_events e
    left join public.staff_profiles actor
      on actor.id = e.actor_staff_profile_id and actor.clinic_id = e.clinic_id
    where e.task_id = t.id and e.clinic_id = t.clinic_id
  ) evt on true
  where t.clinic_id = p_clinic_id
    and t.task_status = 'submitted'
    and (
      v_role in ('owner','admin')
      or exists (
        select 1
        from public.clinic_management_assignments m
        join public.staff_department_assignments ma
          on ma.id = m.manager_assignment_id and ma.clinic_id = m.clinic_id
        where m.clinic_id = t.clinic_id
          and ma.staff_profile_id = v_profile_id
          and m.assignment_status in ('active','delegated')
          and m.effective_from <= current_date
          and (m.effective_to is null or m.effective_to >= current_date)
          and m.department_id = t.department_id
          and (m.unit_id is null or m.unit_id = t.unit_id)
      )
      or a.supervisor_staff_profile_id = v_profile_id
    )
    and assignee.id is distinct from v_profile_id;

  return jsonb_build_object('tasks', v_result);
end;
$function$;

revoke all on function public.get_supervisor_task_reviews(uuid) from public, anon;
grant execute on function public.get_supervisor_task_reviews(uuid) to authenticated;


create or replace function public.get_department_task_board(
  p_clinic_id uuid,
  p_department_id uuid,
  p_status text default null,
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
  v_tasks jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_department_id is null then
    raise exception 'Clinic and department are required' using errcode = '22023';
  end if;
  if p_status is not null and p_status not in
    ('assigned','accepted','in_progress','blocked','submitted','completed','cancelled') then
    raise exception 'Invalid task status filter' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'Task board limit must be between 1 and 200' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid
      and cm.status = 'active' and cm.role in ('owner','admin')
  ) into v_is_admin;

  if not v_is_admin and not exists (
    select 1
    from public.clinic_memberships cm
    join public.staff_profiles sp
      on sp.clinic_id = cm.clinic_id and sp.user_id = cm.user_id
      and sp.employment_status = 'active'
    join public.staff_department_assignments sda
      on sda.clinic_id = sp.clinic_id and sda.staff_profile_id = sp.id
      and sda.assignment_status = 'active'
      and sda.effective_from <= current_date
      and (sda.effective_to is null or sda.effective_to >= current_date)
    join public.clinic_management_assignments ma
      on ma.clinic_id = sda.clinic_id and ma.manager_assignment_id = sda.id
      and ma.department_id = p_department_id
      and ma.assignment_status in ('active','delegated')
      and ma.effective_from <= current_date
      and (ma.effective_to is null or ma.effective_to >= current_date)
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active'
  ) then
    raise exception 'Department management appointment required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.clinic_departments d
    where d.id = p_department_id and d.clinic_id = p_clinic_id and d.is_active
  ) then raise exception 'Active department not found' using errcode = 'P0002'; end if;

  with authorised_tasks as (
    select t.*
    from public.staff_tasks t
    where t.clinic_id = p_clinic_id
      and t.department_id = p_department_id
      and (p_status is null or t.task_status = p_status)
      and (
        v_is_admin or exists (
          select 1
          from public.clinic_memberships cm
          join public.staff_profiles manager_staff
            on manager_staff.clinic_id = cm.clinic_id
            and manager_staff.user_id = cm.user_id
            and manager_staff.employment_status = 'active'
          join public.staff_department_assignments manager_assignment
            on manager_assignment.clinic_id = manager_staff.clinic_id
            and manager_assignment.staff_profile_id = manager_staff.id
            and manager_assignment.assignment_status = 'active'
            and manager_assignment.effective_from <= current_date
            and (manager_assignment.effective_to is null or manager_assignment.effective_to >= current_date)
          join public.clinic_management_assignments ma
            on ma.clinic_id = cm.clinic_id
            and ma.manager_assignment_id = manager_assignment.id
            and ma.department_id = t.department_id
            and (ma.unit_id is null or ma.unit_id = t.unit_id)
            and ma.assignment_status in ('active','delegated')
            and ma.effective_from <= current_date
            and (ma.effective_to is null or ma.effective_to >= current_date)
          where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active'
        )
      )
    order by
      case t.task_status when 'blocked' then 1 when 'submitted' then 2
        when 'assigned' then 3 when 'accepted' then 4
        when 'in_progress' then 5 when 'completed' then 6 else 7 end,
      t.due_at nulls last, t.created_at desc
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'task_title', t.task_title,
    'task_description', t.task_description,
    'priority', t.priority,
    'task_status', t.task_status,
    'due_at', t.due_at,
    'created_at', t.created_at,
    'accepted_at', t.accepted_at,
    'started_at', t.started_at,
    'completed_at', t.completed_at,
    'submitted_at', case when t.task_status = 'submitted' then t.updated_at else null end,
    'reviewed_at', t.reviewed_at,
    'review_status', t.review_status,
    'review_notes', t.review_notes,
    'requires_evidence', t.requires_evidence,
    'requires_supervisor_review', t.requires_supervisor_review,
    'requires_separate_approval', t.requires_separate_approval,
    'department_id', d.id,
    'department_name', d.department_name,
    'unit_name', u.unit_name,
    'assigned_to_assignment_id', aa.id,
    'assignee_profile_id', assignee.id,
    'assignee_name', assignee.full_name,
    'assignee_staff_id', assignee.staff_id,
    'assigned_by_staff_profile_id', t.assigned_by_staff_profile_id,
    'assigned_by_name', assigner.full_name,
    'reviewed_by_staff_profile_id', t.reviewed_by_staff_profile_id,
    'reviewed_by_name', reviewer.full_name,
    'approved_duty', case when jd.id is null then null else jsonb_build_object(
      'id', jd.id,
      'assignment_snapshot', t.duty_snapshot,
      'snapshot_captured_at', t.duty_snapshot_captured_at,
      'snapshot_source', t.duty_snapshot_source,
      'code', jd.duty_code,
      'title', jd.duty_title,
      'description', jd.duty_description,
      'category', jd.duty_category,
      'current_validation_status', jd.validation_status,
      'currently_active', jd.is_active,
      'job_profile_id', jp.id,
      'job_title', jp.job_title,
      'job_profile_validation_status', jp.validation_status,
      'department_role_id', dr.id,
      'duty_department_id', dr.department_id,
      'duty_department_name', duty_department.department_name,
      'department_matches_task_department', dr.department_id = t.department_id
    ) end,
    'evidence', coalesce(ev.items, '[]'::jsonb),
    'events', coalesce(evt.items, '[]'::jsonb)
  ) order by
    case t.task_status when 'blocked' then 1 when 'submitted' then 2
      when 'assigned' then 3 when 'accepted' then 4
      when 'in_progress' then 5 when 'completed' then 6 else 7 end,
    t.due_at nulls last, t.created_at desc), '[]'::jsonb)
  into v_tasks
  from authorised_tasks t
  join public.clinic_departments d
    on d.id = t.department_id and d.clinic_id = t.clinic_id
  left join public.clinic_units u
    on u.id = t.unit_id and u.clinic_id = t.clinic_id
  left join public.staff_department_assignments aa
    on aa.id = t.assigned_to_assignment_id and aa.clinic_id = t.clinic_id
  left join public.staff_profiles assignee
    on assignee.id = aa.staff_profile_id and assignee.clinic_id = t.clinic_id
  left join public.staff_profiles assigner
    on assigner.id = t.assigned_by_staff_profile_id and assigner.clinic_id = t.clinic_id
  left join public.staff_profiles reviewer
    on reviewer.id = t.reviewed_by_staff_profile_id and reviewer.clinic_id = t.clinic_id
  left join public.clinic_job_duties jd
    on jd.id = t.duty_id and jd.clinic_id = t.clinic_id
  left join public.clinic_job_profiles jp
    on jp.id = jd.job_profile_id and jp.clinic_id = jd.clinic_id
  left join public.clinic_department_roles dr
    on dr.id = jp.department_role_id and dr.clinic_id = jp.clinic_id
  left join public.clinic_departments duty_department
    on duty_department.id = dr.department_id and duty_department.clinic_id = dr.clinic_id
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'evidence_type', e.evidence_type,
      'evidence_text', e.evidence_text, 'source_reference', e.source_reference,
      'captured_at', e.captured_at, 'created_at', e.created_at,
      'submitted_by', submitter.full_name
    ) order by e.created_at) as items
    from public.staff_task_evidence e
    left join public.staff_profiles submitter
      on submitter.id = e.submitted_by_staff_profile_id and submitter.clinic_id = e.clinic_id
    where e.clinic_id = t.clinic_id and e.task_id = t.id
  ) ev on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'event_type', e.event_type,
      'from_status', e.from_status,
      'to_status', e.to_status,
      'event_notes', e.event_notes,
      'created_at', e.created_at,
      'actor_name', actor.full_name,
      'metadata', e.metadata
    ) order by e.created_at) as items
    from public.staff_task_events e
    left join public.staff_profiles actor
      on actor.id = e.actor_staff_profile_id and actor.clinic_id = e.clinic_id
    where e.clinic_id = t.clinic_id and e.task_id = t.id
  ) evt on true;

  return jsonb_build_object(
    'department_id', p_department_id,
    'tasks', coalesce(v_tasks, '[]'::jsonb),
    'scope', case when v_is_admin then 'hospital_wide_admin' else 'appointed_department_manager' end,
    'generated_at', now(),
    'limit', p_limit
  );
end;
$function$;

revoke all on function public.get_department_task_board(uuid,uuid,text,integer) from public, anon;
grant execute on function public.get_department_task_board(uuid,uuid,text,integer) to authenticated;

-- Note: this read model reports the linked duty's current approval/active state.
-- It does not rewrite or imply a historical snapshot of the duty's approval state.
