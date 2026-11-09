-- HealthOS AI Stage 5D Part 2F (step 1): authorised manager department discovery.
-- Read-only. Do not expose hospital-wide department lists to staff accounts.
-- The audit RPC separately re-checks department access on every request.
create or replace function public.get_my_managed_departments(p_clinic_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_departments jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null then
    raise exception 'Clinic is required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid
      and cm.status = 'active'
  ) then
    raise exception 'Active clinic membership required' using errcode = '42501';
  end if;
  -- Administrators use the existing independently verified management dashboard.
  if exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid
      and cm.status = 'active' and cm.role in ('owner','admin')
  ) then
    raise exception 'Use the hospital management workspace' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'department_id', d.id,
      'department_name', d.department_name,
      'department_code', d.department_code,
      'leadership_roles', leadership.roles
    ) order by d.department_name
  ), '[]'::jsonb)
  into v_departments
  from (
    select distinct ma.department_id
    from public.staff_profiles sp
    join public.staff_department_assignments sda
      on sda.clinic_id = sp.clinic_id
     and sda.staff_profile_id = sp.id
     and sda.assignment_status = 'active'
     and sda.effective_from <= current_date
     and (sda.effective_to is null or sda.effective_to >= current_date)
    join public.clinic_management_assignments ma
      on ma.clinic_id = sda.clinic_id
     and ma.manager_assignment_id = sda.id
     and ma.assignment_status in ('active','delegated')
     and ma.effective_from <= current_date
     and (ma.effective_to is null or ma.effective_to >= current_date)
    where sp.clinic_id = p_clinic_id and sp.user_id = v_uid
      and sp.employment_status = 'active'
  ) eligible
  join public.clinic_departments d
    on d.id = eligible.department_id and d.clinic_id = p_clinic_id and d.is_active
  cross join lateral (
    select coalesce(jsonb_agg(distinct ma.leadership_role), '[]'::jsonb) as roles
    from public.staff_profiles sp
    join public.staff_department_assignments sda
      on sda.clinic_id = sp.clinic_id and sda.staff_profile_id = sp.id
     and sda.assignment_status = 'active'
     and sda.effective_from <= current_date
     and (sda.effective_to is null or sda.effective_to >= current_date)
    join public.clinic_management_assignments ma
      on ma.clinic_id = sda.clinic_id and ma.manager_assignment_id = sda.id
     and ma.department_id = d.id
     and ma.assignment_status in ('active','delegated')
     and ma.effective_from <= current_date
     and (ma.effective_to is null or ma.effective_to >= current_date)
    where sp.clinic_id = p_clinic_id and sp.user_id = v_uid
      and sp.employment_status = 'active'
  ) leadership;

  return jsonb_build_object(
    'clinic_id', p_clinic_id,
    'read_only', true,
    'scope', 'appointed_departments_only',
    'departments', v_departments,
    'generated_at', now()
  );
end;
$function$;
revoke all on function public.get_my_managed_departments(uuid) from public, anon;
grant execute on function public.get_my_managed_departments(uuid) to authenticated;
comment on function public.get_my_managed_departments(uuid) is
  'Read-only, active-appointment-scoped department discovery for authenticated staff managers; excludes hospital-wide admin access.';
