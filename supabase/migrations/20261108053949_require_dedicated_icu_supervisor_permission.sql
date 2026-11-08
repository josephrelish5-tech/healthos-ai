create or replace function public.healthos_icu_update_supervisor_escalation(
  p_clinic_id uuid,
  p_escalation_id uuid,
  p_action text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Supervisory actions are separate from ordinary clinical-record changes.
  -- Owners/admins retain clinic-wide authority through the permission helper.
  -- Staff require an explicit icu_supervision/manage assignment.
  if not private.has_any_assignment_clinic_permission(
    p_clinic_id,
    'icu_supervision',
    'manage'
  ) then
    raise exception 'Dedicated ICU supervisor permission required';
  end if;

  if p_action not in ('acknowledge', 'resolve') then
    raise exception 'Unsupported escalation action';
  end if;

  if p_action = 'resolve'
     and length(trim(coalesce(p_note, ''))) < 5 then
    raise exception 'A resolution note of at least 5 characters is required';
  end if;

  if length(coalesce(p_note, '')) > 2000 then
    raise exception 'Resolution note is too long';
  end if;

  select status
    into v_status
    from public.icu_supervisor_escalations
   where id = p_escalation_id
     and clinic_id = p_clinic_id
   for update;

  if not found or v_status = 'resolved' then
    raise exception 'Open ICU escalation not found';
  end if;

  if p_action = 'acknowledge' then
    update public.icu_supervisor_escalations
       set status = 'acknowledged',
           acknowledged_by = v_uid,
           acknowledged_at = now(),
           updated_at = now()
     where id = p_escalation_id
       and clinic_id = p_clinic_id;
  else
    update public.icu_supervisor_escalations
       set status = 'resolved',
           resolved_by = v_uid,
           resolved_at = now(),
           resolution_note = trim(p_note),
           updated_at = now()
     where id = p_escalation_id
       and clinic_id = p_clinic_id;
  end if;

  return p_escalation_id;
end;
$function$;

revoke all on function public.healthos_icu_update_supervisor_escalation(uuid, uuid, text, text) from public, anon;
grant execute on function public.healthos_icu_update_supervisor_escalation(uuid, uuid, text, text) to authenticated;
