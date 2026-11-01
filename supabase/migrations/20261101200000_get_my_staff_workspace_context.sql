create or replace function public.get_my_staff_workspace_context(
    p_clinic_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_membership_role text;
    v_profile public.staff_profiles%rowtype;
    v_assignments jsonb;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_clinic_id is null then
        raise exception 'Clinic is required';
    end if;

    select cm.role
      into v_membership_role
    from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_user_id
      and cm.status = 'active'
    limit 1;

    if not found then
        raise exception 'Active clinic membership required';
    end if;

    if v_membership_role in ('owner', 'admin') then
        raise exception 'Management accounts must use the management workspace';
    end if;

    select sp.*
      into v_profile
    from public.staff_profiles sp
    where sp.clinic_id = p_clinic_id
      and sp.user_id = v_user_id
      and sp.employment_status = 'active'
    limit 1;

    if not found then
        raise exception 'Active staff profile not found';
    end if;

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'assignment_id', sda.id,
                'department_id', d.id,
                'department_name', d.department_name,
                'unit_id', u.id,
                'unit_name', u.unit_name,
                'is_primary', sda.is_primary,
                'supervisor_staff_profile_id', sda.supervisor_staff_profile_id,
                'roles', coalesce(role_data.roles, '[]'::jsonb)
            )
            order by sda.is_primary desc, d.department_name
        ),
        '[]'::jsonb
    )
    into v_assignments
    from public.staff_department_assignments sda
    join public.clinic_departments d
      on d.id = sda.department_id
     and d.clinic_id = sda.clinic_id
     and d.is_active = true
    left join public.clinic_units u
      on u.id = sda.unit_id
     and u.clinic_id = sda.clinic_id
     and u.is_active = true
    left join lateral (
        select jsonb_agg(
            jsonb_build_object(
                'role_id', r.id,
                'role_code', r.role_code,
                'role_name', r.role_name,
                'is_primary_role', sar.is_primary_role,
                'registration_required', r.registration_required,
                'registration_body', r.registration_body,
                'clinical_role', r.clinical_role
            )
            order by sar.is_primary_role desc, r.role_name
        ) as roles
        from public.staff_assignment_roles sar
        join public.clinic_professional_roles r
          on r.id = sar.professional_role_id
         and r.clinic_id = sar.clinic_id
         and r.is_active = true
        where sar.clinic_id = sda.clinic_id
          and sar.assignment_id = sda.id
          and sar.is_active = true
          and sar.effective_from <= current_date
          and (sar.effective_to is null or sar.effective_to >= current_date)
    ) role_data on true
    where sda.clinic_id = p_clinic_id
      and sda.staff_profile_id = v_profile.id
      and sda.assignment_status = 'active'
      and sda.effective_from <= current_date
      and (sda.effective_to is null or sda.effective_to >= current_date);

    if jsonb_array_length(v_assignments) = 0 then
        raise exception 'No active department assignment found. Contact your administrator.';
    end if;

    return jsonb_build_object(
        'staff_profile', jsonb_build_object(
            'id', v_profile.id,
            'staff_id', v_profile.staff_id,
            'full_name', v_profile.full_name,
            'employment_status', v_profile.employment_status
        ),
        'clinic_id', p_clinic_id,
        'membership_role', v_membership_role,
        'assignments', v_assignments
    );
end;
$$;

revoke all on function public.get_my_staff_workspace_context(uuid) from public, anon;
grant execute on function public.get_my_staff_workspace_context(uuid) to authenticated;