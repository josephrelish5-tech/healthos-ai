-- Stage 3E: department staff attendance and task accountability read model.
-- Read-only: reuses existing shift, attendance-session, presence and task records.
create or replace function public.get_department_staff_accountability(
  p_clinic_id uuid, p_department_id uuid
) returns jsonb
language plpgsql stable security definer set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_is_admin boolean := false;
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_department_id is null then raise exception 'Clinic and department are required' using errcode = '22023'; end if;

  select exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active' and cm.role in ('owner','admin')
  ) into v_is_admin;

  if not v_is_admin and not exists (
    select 1
    from public.clinic_memberships cm
    join public.staff_profiles ms on ms.clinic_id=cm.clinic_id and ms.user_id=cm.user_id and ms.employment_status='active'
    join public.staff_department_assignments ma on ma.clinic_id=ms.clinic_id and ma.staff_profile_id=ms.id
      and ma.assignment_status='active' and ma.effective_from<=current_date and (ma.effective_to is null or ma.effective_to>=current_date)
    join public.clinic_management_assignments scope on scope.clinic_id=cm.clinic_id and scope.manager_assignment_id=ma.id
      and scope.department_id=p_department_id and scope.assignment_status in ('active','delegated')
      and scope.effective_from<=current_date and (scope.effective_to is null or scope.effective_to>=current_date)
    where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active'
  ) then raise exception 'Department management appointment required' using errcode = '42501'; end if;

  if not exists (select 1 from public.clinic_departments d where d.id=p_department_id and d.clinic_id=p_clinic_id and d.is_active)
    then raise exception 'Active department not found' using errcode = 'P0002'; end if;

  with authorised_assignments as (
    select sda.id assignment_id, sda.unit_id, sda.supervisor_staff_profile_id,
      sp.id staff_profile_id, sp.staff_id, sp.full_name, sp.professional_role, sp.department staff_department_label
    from public.staff_department_assignments sda
    join public.staff_profiles sp on sp.id=sda.staff_profile_id and sp.clinic_id=sda.clinic_id and sp.employment_status='active'
    where sda.clinic_id=p_clinic_id and sda.department_id=p_department_id
      and sda.assignment_status='active' and sda.effective_from<=current_date
      and (sda.effective_to is null or sda.effective_to>=current_date)
      and (
        v_is_admin or exists (
          select 1
          from public.clinic_memberships cm
          join public.staff_profiles ms on ms.clinic_id=cm.clinic_id and ms.user_id=cm.user_id and ms.employment_status='active'
          join public.staff_department_assignments ma on ma.clinic_id=ms.clinic_id and ma.staff_profile_id=ms.id
            and ma.assignment_status='active' and ma.effective_from<=current_date and (ma.effective_to is null or ma.effective_to>=current_date)
          join public.clinic_management_assignments scope on scope.clinic_id=cm.clinic_id and scope.manager_assignment_id=ma.id
            and scope.department_id=sda.department_id and (scope.unit_id is null or scope.unit_id=sda.unit_id)
            and scope.assignment_status in ('active','delegated') and scope.effective_from<=current_date
            and (scope.effective_to is null or scope.effective_to>=current_date)
          where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active'
        )
      )
  ),
  staff_rows as (
    select a.assignment_id,a.staff_profile_id,a.staff_id,a.full_name,a.professional_role,a.staff_department_label,
      u.unit_name,a.supervisor_staff_profile_id,
      pres.presence_status,pres.last_seen_at,pres.last_login_at,pres.last_clock_in_at,pres.last_clock_out_at,
      sh.shift_type,sh.starts_at,sh.ends_at,sh.attendance_status,sh.clocked_in_at shift_clocked_in_at,sh.clocked_out_at shift_clocked_out_at,
      att.open_clock_in_at,att.latest_clock_in_at,att.latest_clock_out_at,
      coalesce(tc.assigned_30d,0) tasks_assigned_30d,coalesce(tc.completed_30d,0) tasks_completed_30d,coalesce(tc.overdue_open,0) overdue_open_tasks
    from authorised_assignments a
    left join public.clinic_units u on u.id=a.unit_id and u.clinic_id=p_clinic_id
    left join public.staff_presence pres on pres.staff_profile_id=a.staff_profile_id and pres.clinic_id=p_clinic_id
    left join lateral (
      select ss.shift_type,ss.starts_at,ss.ends_at,ss.attendance_status,ss.clocked_in_at,ss.clocked_out_at
      from public.staff_shifts ss where ss.clinic_id=p_clinic_id and ss.staff_profile_id=a.staff_profile_id
        and ss.shift_date=(now() at time zone 'Africa/Lagos')::date order by ss.starts_at desc limit 1
    ) sh on true
    left join lateral (
      select max(s.clocked_in_at) filter(where s.clocked_out_at is null) open_clock_in_at,
        max(s.clocked_in_at) latest_clock_in_at,max(s.clocked_out_at) latest_clock_out_at
      from public.staff_attendance_sessions s where s.clinic_id=p_clinic_id and s.staff_profile_id=a.staff_profile_id
        and s.clocked_in_at>=now()-interval '30 days'
    ) att on true
    left join lateral (
      select count(*) filter(where t.created_at>=now()-interval '30 days')::integer assigned_30d,
        count(*) filter(where t.task_status='completed' and t.created_at>=now()-interval '30 days')::integer completed_30d,
        count(*) filter(where t.due_at<now() and t.task_status not in ('completed','cancelled'))::integer overdue_open
      from public.staff_tasks t where t.clinic_id=p_clinic_id and t.assigned_to_assignment_id=a.assignment_id
    ) tc on true
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'assignment_id',assignment_id,'staff_profile_id',staff_profile_id,'staff_id',staff_id,'full_name',full_name,
    'professional_role',professional_role,'staff_department_label',staff_department_label,'unit_name',unit_name,
    'presence_status',presence_status,'last_seen_at',last_seen_at,'last_login_at',last_login_at,
    'last_clock_in_at',last_clock_in_at,'last_clock_out_at',last_clock_out_at,
    'today_shift_type',shift_type,'today_shift_starts_at',starts_at,'today_shift_ends_at',ends_at,
    'today_shift_attendance_status',attendance_status,'today_shift_clocked_in_at',shift_clocked_in_at,
    'today_shift_clocked_out_at',shift_clocked_out_at,'open_attendance_clock_in_at',open_clock_in_at,
    'latest_session_clock_in_at',latest_clock_in_at,'latest_session_clock_out_at',latest_clock_out_at,
    'tasks_assigned_30d',tasks_assigned_30d,'tasks_completed_30d',tasks_completed_30d,'overdue_open_tasks',overdue_open_tasks
  ) order by full_name),'[]'::jsonb) into v_rows from staff_rows;

  return jsonb_build_object('clinic_id',p_clinic_id,'department_id',p_department_id,
    'scope',case when v_is_admin then 'department_admin' else 'appointed_department_or_unit_scope' end,
    'generated_at',now(),'staff',v_rows);
end;
$function$;

revoke all on function public.get_department_staff_accountability(uuid,uuid) from public, anon;
grant execute on function public.get_department_staff_accountability(uuid,uuid) to authenticated;
