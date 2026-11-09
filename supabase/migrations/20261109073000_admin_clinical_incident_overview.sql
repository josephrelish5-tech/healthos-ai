-- Stage 4C review correction: administrator-gated, metadata-only clinical incident overview.
-- This migration is intentionally committed to the feature branch only. Do not apply to production until reviewed.
create or replace function public.get_admin_clinical_incident_overview(
  p_clinic_id uuid,
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_events jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null then
    raise exception 'Clinic is required' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Limit must be between 1 and 500' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.clinics c
    where c.id = p_clinic_id and c.owner_user_id = v_uid
  ) and not exists (
    select 1 from public.clinic_memberships m
    where m.clinic_id = p_clinic_id
      and m.user_id = v_uid
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  ) then
    raise exception 'Hospital administrator access required' using errcode = '42501';
  end if;

  with incident_events as (
    select
      'Hospital incident register'::text as source,
      h.incident_reference as reference,
      h.department_name as department,
      replace(h.category, '_', ' ') as kind,
      h.severity,
      h.status,
      h.reported_at as occurred_at
    from public.hospital_incident_reports h
    where h.clinic_id = p_clinic_id

    union all

    select
      'Laboratory critical results',
      'LAB · ' || left(l.id::text, 8),
      'Laboratory',
      'Critical test result',
      'critical',
      l.status,
      l.entered_at
    from public.laboratory_test_results l
    where l.clinic_id = p_clinic_id and l.is_critical is true

    union all

    select
      'Radiology critical findings',
      'RAD · ' || left(r.id::text, 8),
      'Radiology',
      'Critical imaging finding',
      'critical',
      r.status,
      r.entered_at
    from public.radiology_reports r
    where r.clinic_id = p_clinic_id and r.critical_finding is true

    union all

    select
      'ICU emergency incidents',
      'ICU · ' || left(i.id::text, 8),
      'ICU',
      replace(i.incident_type, '_', ' '),
      i.severity,
      i.status,
      coalesce(i.occurred_at, i.created_at)
    from public.icu_emergency_incidents i
    where i.clinic_id = p_clinic_id

    union all

    select
      'Clinical decision-support alerts',
      'CDS · ' || left(a.id::text, 8),
      'Clinical decision support',
      replace(a.rule_code, '_', ' '),
      a.severity,
      a.status,
      a.created_at
    from public.clinical_decision_support_alerts a
    where a.clinic_id = p_clinic_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source', e.source,
        'reference', e.reference,
        'department', e.department,
        'kind', e.kind,
        'severity', e.severity,
        'status', e.status,
        'at', e.occurred_at
      )
      order by e.occurred_at desc nulls last
    ),
    '[]'::jsonb
  )
  into v_events
  from (
    select * from incident_events
    order by occurred_at desc nulls last
    limit p_limit
  ) e;

  return jsonb_build_object(
    'clinic_id', p_clinic_id,
    'events', v_events,
    'available_sources', jsonb_build_array(
      'Hospital incident register',
      'Laboratory critical results',
      'Radiology critical findings',
      'ICU emergency incidents',
      'Clinical decision-support alerts'
    ),
    'restricted_sources', '[]'::jsonb,
    'generated_at', pg_catalog.now(),
    'scope', 'administrator_only_metadata'
  );
end;
$function$;

revoke all on function public.get_admin_clinical_incident_overview(uuid, integer) from public;
grant execute on function public.get_admin_clinical_incident_overview(uuid, integer) to authenticated;
