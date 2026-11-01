create or replace function public.get_my_staff_duties(
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
    v_profile_id uuid;
    v_result jsonb;
begin
    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_clinic_id is null then
        raise exception 'Clinic is required';
    end if;

    if not exists (
        select 1
        from public.clinic_memberships cm
        where cm.clinic_id = p_clinic_id
          and cm.user_id = v_user_id
          and cm.status = 'active'
          and cm.role not in ('owner', 'admin')
    ) then
        raise exception 'Active staff membership required';
    end if;

    select sp.id
      into v_profile_id
    from public.staff_profiles sp
    where sp.clinic_id = p_clinic_id
      and sp.user_id = v_user_id
      and sp.employment_status = 'active'
    limit 1;

    if v_profile_id is null then
        raise exception 'Active staff profile not found';
    end if;

    select jsonb_build_object(
        'job_profiles',
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'assignment_id', assignment_data.assignment_id,
                    'department_name', assignment_data.department_name,
                    'unit_name', assignment_data.unit_name,
                    'role_name', assignment_data.role_name,
                    'job_profile_id', assignment_data.job_profile_id,
                    'job_title', assignment_data.job_title,
                    'job_purpose', assignment_data.job_purpose,
                    'job_summary', assignment_data.job_summary,
                    'scope_notes', assignment_data.scope_notes,
                    'validation_status', assignment_data.validation_status,
                    'duties', assignment_data.duties
                )
                order by assignment_data.is_primary desc,
                         assignment_data.department_name,
                         assignment_data.role_name
            ),
            '[]'::jsonb
        )
    )
    into v_result
    from (
        select
            sda.id as assignment_id,
            sda.is_primary,
            d.department_name,
            u.unit_name,
            r.role_name,
            jp.id as job_profile_id,
            jp.job_title,
            jp.job_purpose,
            jp.job_summary,
            jp.scope_notes,
            jp.validation_status,
            coalesce(duty_data.duties, '[]'::jsonb) as duties
        from public.staff_department_assignments sda
        join public.clinic_departments d
          on d.id = sda.department_id
         and d.clinic_id = sda.clinic_id
         and d.is_active = true
        left join public.clinic_units u
          on u.id = sda.unit_id
         and u.clinic_id = sda.clinic_id
         and u.is_active = true
        join public.staff_assignment_roles sar
          on sar.assignment_id = sda.id
         and sar.clinic_id = sda.clinic_id
         and sar.is_active = true
         and sar.effective_from <= current_date
         and (sar.effective_to is null or sar.effective_to >= current_date)
        join public.clinic_professional_roles r
          on r.id = sar.professional_role_id
         and r.clinic_id = sar.clinic_id
         and r.is_active = true
        join public.clinic_department_roles dr
          on dr.department_id = sda.department_id
         and dr.professional_role_id = r.id
         and dr.clinic_id = sda.clinic_id
         and dr.is_active = true
        join public.clinic_job_profiles jp
          on jp.department_role_id = dr.id
         and jp.clinic_id = dr.clinic_id
         and jp.is_active = true
        left join lateral (
            select jsonb_agg(
                jsonb_build_object(
                    'duty_id', jd.id,
                    'duty_code', jd.duty_code,
                    'duty_title', jd.duty_title,
                    'duty_description', jd.duty_description,
                    'duty_category', jd.duty_category,
                    'expected_frequency', jd.expected_frequency,
                    'evidence_required', jd.evidence_required,
                    'supervisor_review_required', jd.supervisor_review_required,
                    'separate_approval_required', jd.separate_approval_required
                )
                order by jd.sort_order, jd.duty_title
            ) as duties
            from public.clinic_job_duties jd
            where jd.job_profile_id = jp.id
              and jd.clinic_id = jp.clinic_id
              and jd.is_active = true
              and jd.validation_status = 'hospital_approved'
        ) duty_data on true
        where sda.clinic_id = p_clinic_id
          and sda.staff_profile_id = v_profile_id
          and sda.assignment_status = 'active'
          and sda.effective_from <= current_date
          and (sda.effective_to is null or sda.effective_to >= current_date)
    ) assignment_data;

    return coalesce(v_result, jsonb_build_object('job_profiles', '[]'::jsonb));
end;
$$;

revoke all on function public.get_my_staff_duties(uuid) from public, anon;
grant execute on function public.get_my_staff_duties(uuid) to authenticated;