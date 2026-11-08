-- HealthOS Medical System: universal department workspace foundation.
-- Read-only, clinic-scoped context for authorised hospital administrators and appointed department managers.
create or replace function public.get_department_workspace_foundation(
  p_clinic_id uuid,
  p_department_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_department jsonb;
  v_staff_count integer := 0;
  v_task_counts jsonb;
  v_roles jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_department_id is null then
    raise exception 'Clinic and department are required' using errcode = '22023';
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

  select jsonb_build_object(
    'id', d.id, 'code', d.department_code, 'name', d.department_name,
    'group', d.department_group, 'description', d.description,
    'is_custom', d.is_custom, 'parent_department_id', d.parent_department_id
  ) into v_department
  from public.clinic_departments d
  where d.id = p_department_id and d.clinic_id = p_clinic_id and d.is_active = true;

  if v_department is null then
    raise exception 'Active department not found' using errcode = 'P0002';
  end if;

  select count(*)::integer into v_staff_count
  from public.staff_department_assignments a
  join public.staff_profiles sp
    on sp.id = a.staff_profile_id and sp.clinic_id = a.clinic_id
  where a.clinic_id = p_clinic_id and a.department_id = p_department_id
    and a.assignment_status = 'active' and sp.employment_status = 'active'
    and a.effective_from <= current_date
    and (a.effective_to is null or a.effective_to >= current_date);

  select jsonb_build_object(
    'total', count(*)::integer,
    'pending', count(*) filter (where t.task_status in ('assigned','accepted','in_progress','blocked','submitted'))::integer,
    'completed', count(*) filter (where t.task_status = 'completed')::integer,
    'overdue', count(*) filter (where t.due_at < now() and t.task_status not in ('completed','cancelled'))::integer,
    'awaiting_review', count(*) filter (where t.task_status = 'submitted' and (t.requires_supervisor_review or t.requires_separate_approval))::integer
  ) into v_task_counts
  from public.staff_tasks t
  where t.clinic_id = p_clinic_id and t.department_id = p_department_id
    and t.created_at >= now() - interval '30 days';

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'role_id', r.id, 'role_code', r.role_code, 'role_name', r.role_name,
      'clinical_role', r.clinical_role,
      'registration_required', r.registration_required,
      'registration_body', r.registration_body,
      'job_profiles', coalesce(jp_data.profiles, '[]'::jsonb)
    ) order by r.role_name
  ), '[]'::jsonb) into v_roles
  from public.clinic_department_roles dr
  join public.clinic_professional_roles r
    on r.id = dr.professional_role_id and r.clinic_id = dr.clinic_id
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'job_profile_id', jp.id, 'job_title', jp.job_title,
      'job_purpose', jp.job_purpose, 'job_summary', jp.job_summary,
      'scope_notes', jp.scope_notes, 'validation_status', jp.validation_status,
      'duties', coalesce(duty_data.items, '[]'::jsonb)
    ) order by jp.job_title) as profiles
    from public.clinic_job_profiles jp
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'duty_id', jd.id, 'duty_code', jd.duty_code,
        'duty_title', jd.duty_title, 'duty_description', jd.duty_description,
        'duty_category', jd.duty_category, 'expected_frequency', jd.expected_frequency,
        'evidence_required', jd.evidence_required,
        'supervisor_review_required', jd.supervisor_review_required,
        'separate_approval_required', jd.separate_approval_required
      ) order by jd.sort_order, jd.duty_title) as items
      from public.clinic_job_duties jd
      where jd.job_profile_id = jp.id and jd.clinic_id = jp.clinic_id
        and jd.is_active = true and jd.validation_status = 'hospital_approved'
    ) duty_data on true
    where jp.department_role_id = dr.id and jp.clinic_id = dr.clinic_id
      and jp.is_active = true
  ) jp_data on true
  where dr.clinic_id = p_clinic_id and dr.department_id = p_department_id
    and dr.is_active = true and r.is_active = true;

  return jsonb_build_object(
    'department', v_department,
    'summary', jsonb_build_object('active_staff', v_staff_count, 'tasks_30_days', v_task_counts),
    'professional_roles', v_roles,
    'access_scope', case when v_is_admin then 'hospital_wide_admin' else 'appointed_department_manager' end,
    'generated_at', now()
  );
end;
$function$;

revoke all on function public.get_department_workspace_foundation(uuid, uuid) from public, anon;
grant execute on function public.get_department_workspace_foundation(uuid, uuid) to authenticated;
comment on function public.get_department_workspace_foundation(uuid, uuid)
  is 'Returns department identity, approved role/job duty catalogue and 30-day task summary for hospital admins or formally appointed department managers.';
