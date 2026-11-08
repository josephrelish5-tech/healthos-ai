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
  where cm.clinic_id = p_clinic_id and cm.user_id = v_user_id and cm.status = 'active'
  limit 1;
  if v_role is null then raise exception 'Active hospital membership required'; end if;

  select sp.id into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_user_id and sp.employment_status = 'active'
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
    'assignee_name', sp.full_name,
    'assignee_staff_id', sp.staff_id,
    'evidence', coalesce(ev.items, '[]'::jsonb)
  ) order by t.updated_at), '[]'::jsonb)
  into v_result
  from public.staff_tasks t
  join public.clinic_departments d on d.id = t.department_id and d.clinic_id = t.clinic_id
  left join public.clinic_units u on u.id = t.unit_id and u.clinic_id = t.clinic_id
  join public.staff_department_assignments a on a.id = t.assigned_to_assignment_id and a.clinic_id = t.clinic_id
  join public.staff_profiles sp on sp.id = a.staff_profile_id and sp.clinic_id = a.clinic_id
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'type', e.evidence_type, 'text', e.evidence_text,
      'reference', e.source_reference, 'captured_at', e.captured_at,
      'submitted_by', es.full_name
    ) order by e.created_at) items
    from public.staff_task_evidence e
    left join public.staff_profiles es on es.id = e.submitted_by_staff_profile_id and es.clinic_id = e.clinic_id
    where e.task_id = t.id and e.clinic_id = t.clinic_id
  ) ev on true
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
    and sp.id is distinct from v_profile_id;

  return jsonb_build_object('tasks', v_result);
end;
$function$;

create or replace function public.get_department_supervisor_task_reviews(
  p_clinic_id uuid,
  p_department_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_review_data jsonb;
  v_tasks jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_department_id is null then
    raise exception 'Clinic and department are required' using errcode = '22023';
  end if;

  -- The existing review RPC enforces the user's hospital and supervisor scope.
  v_review_data := public.get_supervisor_task_reviews(p_clinic_id);

  if not exists (
    select 1 from public.clinic_departments d
    where d.id = p_department_id and d.clinic_id = p_clinic_id and d.is_active = true
  ) then
    raise exception 'Active department not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(item.value order by item.value->>'submitted_at'), '[]'::jsonb)
    into v_tasks
  from jsonb_array_elements(coalesce(v_review_data->'tasks', '[]'::jsonb)) as item(value)
  where item.value->>'department_id' = p_department_id::text;

  return jsonb_build_object(
    'department_id', p_department_id,
    'tasks', coalesce(v_tasks, '[]'::jsonb),
    'generated_at', now()
  );
end;
$function$;

revoke all on function public.get_department_supervisor_task_reviews(uuid, uuid) from public, anon;
grant execute on function public.get_department_supervisor_task_reviews(uuid, uuid) to authenticated;
