-- Stage 5D Part 2G: individual staff duty execution history.
-- Read-only self-service history. Staff can see only tasks assigned to their own staff profile.
-- Historical assignments remain visible even after the assignment itself is no longer active.
-- Evidence content and storage paths are intentionally not exposed by this history endpoint.

create or replace function public.get_my_duty_execution_history(
  p_clinic_id uuid,
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
  v_profile_id uuid;
  v_history jsonb;
  v_total integer;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_clinic_id is null then
    raise exception 'Clinic is required' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'History limit must be between 1 and 200' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_uid
      and cm.status = 'active'
      and cm.role not in ('owner','admin')
  ) then
    raise exception 'Active staff membership required' using errcode = '42501';
  end if;

  select sp.id
    into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id
    and sp.user_id = v_uid
    and sp.employment_status = 'active'
  limit 1;

  if v_profile_id is null then
    raise exception 'Active staff profile not found' using errcode = '42501';
  end if;

  select count(*)::integer
    into v_total
  from public.staff_tasks t
  join public.staff_department_assignments sda
    on sda.id = t.assigned_to_assignment_id
   and sda.clinic_id = t.clinic_id
  where t.clinic_id = p_clinic_id
    and sda.staff_profile_id = v_profile_id;

  with own_tasks as (
    select
      t.*,
      d.department_name,
      u.unit_name,
      sda.staff_profile_id as assignee_profile_id,
      reviewer.full_name as reviewer_name
    from public.staff_tasks t
    join public.staff_department_assignments sda
      on sda.id = t.assigned_to_assignment_id
     and sda.clinic_id = t.clinic_id
    left join public.clinic_departments d
      on d.id = t.department_id
     and d.clinic_id = t.clinic_id
    left join public.clinic_units u
      on u.id = t.unit_id
     and u.clinic_id = t.clinic_id
    left join public.staff_profiles reviewer
      on reviewer.id = t.reviewed_by_staff_profile_id
     and reviewer.clinic_id = t.clinic_id
    where t.clinic_id = p_clinic_id
      and sda.staff_profile_id = v_profile_id
    order by t.created_at desc, t.id
    limit p_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'task_id', ot.id,
        'task_title', ot.task_title,
        'task_description', ot.task_description,
        'priority', ot.priority,
        'task_status', ot.task_status,
        'department_id', ot.department_id,
        'department_name', ot.department_name,
        'unit_id', ot.unit_id,
        'unit_name', ot.unit_name,
        'duty_id', ot.duty_id,
        'duty_snapshot', ot.duty_snapshot,
        'duty_snapshot_captured_at', ot.duty_snapshot_captured_at,
        'duty_snapshot_source', ot.duty_snapshot_source,
        'due_at', ot.due_at,
        'created_at', ot.created_at,
        'accepted_at', ot.accepted_at,
        'started_at', ot.started_at,
        'completed_at', ot.completed_at,
        'reviewed_at', ot.reviewed_at,
        'review_status', ot.review_status,
        'reviewer_name', ot.reviewer_name,
        'review_notes', ot.review_notes,
        'requires_evidence', ot.requires_evidence,
        'requires_supervisor_review', ot.requires_supervisor_review,
        'requires_separate_approval', ot.requires_separate_approval,
        'evidence', coalesce(ev.items, '[]'::jsonb),
        'events', coalesce(evt.items, '[]'::jsonb)
      )
      order by ot.created_at desc, ot.id
    ),
    '[]'::jsonb
  )
  into v_history
  from own_tasks ot
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'evidence_id', e.id,
        'evidence_type', e.evidence_type,
        'captured_at', e.captured_at,
        'created_at', e.created_at,
        'has_note', (nullif(btrim(coalesce(e.evidence_text,'')), '') is not null),
        'has_reference', (nullif(btrim(coalesce(e.source_reference,'')), '') is not null)
      )
      order by e.created_at, e.id
    ) as items
    from public.staff_task_evidence e
    where e.clinic_id = ot.clinic_id
      and e.task_id = ot.id
      and e.submitted_by_staff_profile_id = v_profile_id
  ) ev on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'event_id', e.id,
        'event_type', e.event_type,
        'from_status', e.from_status,
        'to_status', e.to_status,
        'event_notes', e.event_notes,
        'actor_name', actor.full_name,
        'created_at', e.created_at
      )
      order by e.created_at, e.id
    ) as items
    from public.staff_task_events e
    left join public.staff_profiles actor
      on actor.id = e.actor_staff_profile_id
     and actor.clinic_id = e.clinic_id
    where e.clinic_id = ot.clinic_id
      and e.task_id = ot.id
  ) evt on true;

  return jsonb_build_object(
    'read_only', true,
    'scope', 'current_staff_profile_only',
    'clinic_id', p_clinic_id,
    'staff_profile_id', v_profile_id,
    'records_total', coalesce(v_total, 0),
    'records_returned', jsonb_array_length(coalesce(v_history, '[]'::jsonb)),
    'limit', p_limit,
    'generated_at', now(),
    'history', coalesce(v_history, '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.get_my_duty_execution_history(uuid, integer) from public, anon;
grant execute on function public.get_my_duty_execution_history(uuid, integer) to authenticated;
