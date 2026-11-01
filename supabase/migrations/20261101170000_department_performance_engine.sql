-- HealthOS AI
-- Step 7: Department Performance & Operations Engine
-- Applied directly to Supabase on 2026-11-01 and recorded here for source control.
-- This migration is safe to re-run.

create index if not exists staff_tasks_department_due_idx
  on public.staff_tasks (clinic_id, department_id, due_at);

create index if not exists staff_tasks_department_status_idx
  on public.staff_tasks (clinic_id, department_id, task_status);

create index if not exists staff_department_assignments_department_active_idx
  on public.staff_department_assignments
    (clinic_id, department_id, assignment_status, effective_from, effective_to);

create or replace function public.get_department_performance(
  p_clinic_id uuid,
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_is_admin boolean := false;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_clinic_id is null or p_from is null or p_to is null
     or p_to <= p_from or p_to - p_from > interval '366 days' then
    raise exception 'Invalid clinic or reporting period' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_user_id
      and cm.status = 'active'
      and cm.role in ('owner', 'admin')
  ) into v_is_admin;

  if not v_is_admin and not exists (
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
     and ma.assignment_status in ('active', 'delegated')
     and ma.effective_from <= current_date
     and (ma.effective_to is null or ma.effective_to >= current_date)
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_user_id
      and cm.status = 'active'
  ) then
    raise exception 'You are not authorised to view department performance for this hospital'
      using errcode = '42501';
  end if;

  with authorised_scope as (
    select d.id as department_id, null::uuid as unit_id
    from public.clinic_departments d
    where d.clinic_id = p_clinic_id
      and d.is_active = true
      and v_is_admin

    union

    select ma.department_id, ma.unit_id
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
     and ma.assignment_status in ('active', 'delegated')
     and ma.effective_from <= current_date
     and (ma.effective_to is null or ma.effective_to >= current_date)
    join public.clinic_departments d
      on d.id = ma.department_id
     and d.clinic_id = ma.clinic_id
     and d.is_active = true
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_user_id
      and cm.status = 'active'
      and not v_is_admin
  ),
  scoped_rows as (
    select
      s.department_id,
      s.unit_id,
      d.department_name,
      u.unit_name,
      count(t.id)::integer as tasks_assigned,
      count(t.id) filter (
        where t.task_status in ('assigned','accepted','in_progress','blocked','submitted')
      )::integer as tasks_pending,
      count(t.id) filter (where t.task_status = 'completed')::integer as tasks_completed,
      count(t.id) filter (where t.task_status = 'blocked')::integer as tasks_blocked,
      count(t.id) filter (
        where t.due_at < now()
          and t.task_status not in ('completed','cancelled')
      )::integer as tasks_overdue,
      count(t.id) filter (
        where t.task_status = 'submitted'
          and (t.requires_supervisor_review or t.requires_separate_approval)
      )::integer as approvals_pending,
      (
        select count(*)::integer
        from public.staff_department_assignments a
        join public.staff_profiles sp
          on sp.id = a.staff_profile_id
         and sp.clinic_id = a.clinic_id
         and sp.employment_status = 'active'
        where a.clinic_id = p_clinic_id
          and a.department_id = s.department_id
          and (s.unit_id is null or a.unit_id = s.unit_id)
          and a.assignment_status = 'active'
          and a.effective_from <= current_date
          and (a.effective_to is null or a.effective_to >= current_date)
      ) as active_staff
    from authorised_scope s
    join public.clinic_departments d
      on d.id = s.department_id and d.clinic_id = p_clinic_id
    left join public.clinic_units u
      on u.id = s.unit_id and u.clinic_id = p_clinic_id
    left join public.staff_tasks t
      on t.clinic_id = p_clinic_id
     and t.department_id = s.department_id
     and (s.unit_id is null or t.unit_id = s.unit_id)
     and t.created_at >= p_from
     and t.created_at < p_to
    group by s.department_id, s.unit_id, d.department_name, u.unit_name
  )
  select jsonb_build_object(
    'clinic_id', p_clinic_id,
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'scope', case when v_is_admin then 'hospital_wide' else 'assigned_departments_only' end,
    'departments', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'department_id', department_id,
          'department_name', department_name,
          'unit_id', unit_id,
          'unit_name', unit_name,
          'active_staff', active_staff,
          'tasks_assigned', tasks_assigned,
          'tasks_pending', tasks_pending,
          'tasks_completed', tasks_completed,
          'tasks_blocked', tasks_blocked,
          'tasks_overdue', tasks_overdue,
          'approvals_pending', approvals_pending,
          'completion_rate_percent',
            case when tasks_assigned - (
              select count(*)::integer
              from public.staff_tasks cancelled
              where cancelled.clinic_id = p_clinic_id
                and cancelled.department_id = scoped_rows.department_id
                and (scoped_rows.unit_id is null or cancelled.unit_id = scoped_rows.unit_id)
                and cancelled.created_at >= p_from
                and cancelled.created_at < p_to
                and cancelled.task_status = 'cancelled'
            ) > 0
            then round(
              100.0 * tasks_completed /
              (tasks_assigned - (
                select count(*)::integer
                from public.staff_tasks cancelled
                where cancelled.clinic_id = p_clinic_id
                  and cancelled.department_id = scoped_rows.department_id
                  and (scoped_rows.unit_id is null or cancelled.unit_id = scoped_rows.unit_id)
                  and cancelled.created_at >= p_from
                  and cancelled.created_at < p_to
                  and cancelled.task_status = 'cancelled'
              )), 1
            )
            else 0 end
        )
        order by department_name, unit_name nulls first
      ),
      '[]'::jsonb
    )
  ) into v_result
  from scoped_rows;

  return v_result;
end;
$function$;

revoke all on function public.get_department_performance(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_department_performance(uuid, timestamptz, timestamptz)
  to authenticated;

comment on function public.get_department_performance(uuid, timestamptz, timestamptz)
  is 'Returns department/unit task and staffing summary only for active hospital owners/admins or formally appointed department/unit managers.';
