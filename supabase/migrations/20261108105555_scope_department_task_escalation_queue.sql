-- Stage 3I-A security correction: limit escalation queue rows to the manager's appointed department/unit scope.
create or replace function public.get_department_task_escalations(
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
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_department_id is null then raise exception 'Clinic and department are required' using errcode = '22023'; end if;
  if p_status is not null and p_status not in ('open','acknowledged','resolved','dismissed') then raise exception 'Invalid escalation status filter' using errcode = '22023'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then raise exception 'Escalation queue limit must be between 1 and 200' using errcode = '22023'; end if;

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
    join public.staff_department_assignments a
      on a.clinic_id = sp.clinic_id and a.staff_profile_id = sp.id
      and a.assignment_status = 'active'
      and a.effective_from <= current_date
      and (a.effective_to is null or a.effective_to >= current_date)
    join public.clinic_management_assignments m
      on m.clinic_id = a.clinic_id and m.manager_assignment_id = a.id
      and m.department_id = p_department_id
      and m.assignment_status in ('active','delegated')
      and m.effective_from <= current_date
      and (m.effective_to is null or m.effective_to >= current_date)
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active'
  ) then
    raise exception 'Hospital administrator or appointed department/unit manager access required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.clinic_departments d
    where d.id = p_department_id and d.clinic_id = p_clinic_id and d.is_active
  ) then
    raise exception 'Active department not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(item order by
    case item->>'severity' when 'critical' then 1 when 'urgent' then 2 when 'high' then 3 else 4 end,
    (item->>'created_at')::timestamptz desc
  ), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', e.id, 'task_id', e.task_id, 'department_id', e.department_id,
      'unit_id', e.unit_id, 'task_title', t.task_title, 'task_status', t.task_status,
      'task_due_at', t.due_at, 'severity', e.severity, 'source', e.source,
      'escalation_level', e.escalation_level, 'status', e.status,
      'reason', e.reason, 'raised_by_user_id', e.raised_by_user_id,
      'raised_by_name', raiser.full_name, 'created_at', e.created_at,
      'acknowledged_at', e.acknowledged_at, 'resolved_at', e.resolved_at,
      'resolution_notes', e.resolution_notes
    ) as item
    from public.department_task_escalations e
    join public.staff_tasks t on t.id = e.task_id and t.clinic_id = e.clinic_id
    left join public.staff_profiles raiser on raiser.id = e.raised_by_staff_profile_id and raiser.clinic_id = e.clinic_id
    where e.clinic_id = p_clinic_id
      and e.department_id = p_department_id
      and (p_status is null or e.status = p_status)
      and (
        v_is_admin
        or exists (
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
          join public.clinic_management_assignments m
            on m.clinic_id = manager_assignment.clinic_id
            and m.manager_assignment_id = manager_assignment.id
            and m.department_id = e.department_id
            and (m.unit_id is null or m.unit_id = e.unit_id)
            and m.assignment_status in ('active','delegated')
            and m.effective_from <= current_date
            and (m.effective_to is null or m.effective_to >= current_date)
          where cm.clinic_id = p_clinic_id
            and cm.user_id = v_uid
            and cm.status = 'active'
        )
      )
    order by e.created_at desc
    limit p_limit
  ) q;

  return jsonb_build_object(
    'clinic_id', p_clinic_id,
    'department_id', p_department_id,
    'scope', case when v_is_admin then 'hospital_wide_admin' else 'appointed_department_or_unit_manager' end,
    'escalations', coalesce(v_items, '[]'::jsonb),
    'generated_at', now(),
    'limit', p_limit
  );
end;
$function$;

revoke all on function public.get_department_task_escalations(uuid,uuid,text,integer) from public, anon;
grant execute on function public.get_department_task_escalations(uuid,uuid,text,integer) to authenticated;