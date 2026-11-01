create or replace function public.get_clinic_professional_roles(
    p_clinic_id uuid,
    p_department_id uuid
)
returns table (
    id uuid,
    role_code text,
    role_name text,
    registration_required boolean,
    registration_body text,
    clinical_role boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_clinic_id is null or p_department_id is null then
        raise exception 'Clinic and department are required';
    end if;

    if not exists (
        select 1 from public.clinics c
        where c.id = p_clinic_id and c.owner_user_id = v_user_id
    ) and not exists (
        select 1 from public.clinic_memberships cm
        where cm.clinic_id = p_clinic_id
          and cm.user_id = v_user_id
          and cm.status = 'active'
          and cm.role in ('owner', 'admin')
    ) then
        raise exception 'Administrator access required';
    end if;

    if not exists (
        select 1 from public.clinic_departments d
        where d.id = p_department_id
          and d.clinic_id = p_clinic_id
          and d.is_active = true
    ) then
        raise exception 'Active department not found in this clinic';
    end if;

    return query
    select r.id, r.role_code, r.role_name,
           r.registration_required, r.registration_body, r.clinical_role
    from public.clinic_department_roles dr
    join public.clinic_professional_roles r
      on r.id = dr.professional_role_id
     and r.clinic_id = dr.clinic_id
    where dr.clinic_id = p_clinic_id
      and dr.department_id = p_department_id
      and dr.is_active = true
      and r.is_active = true
    order by r.role_name;
end;
$$;

revoke all on function public.get_clinic_professional_roles(uuid, uuid) from public, anon;
grant execute on function public.get_clinic_professional_roles(uuid, uuid) to authenticated;
