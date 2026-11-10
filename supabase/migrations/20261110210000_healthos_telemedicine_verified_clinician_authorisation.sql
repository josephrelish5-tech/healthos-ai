-- Telemedicine clinical authorisation hardening.
-- This migration deliberately uses a telemedicine-specific helper; the shared
-- department assignment helper remains unchanged for non-clinical workflows.

create or replace function public.healthos_user_is_authorised_telemedicine_clinician(
  p_clinic_id uuid,
  p_department_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.staff_profiles sp
    join public.staff_department_assignments sda
      on sda.staff_profile_id = sp.id
     and sda.clinic_id = sp.clinic_id
    join public.staff_assignment_roles sar
      on sar.assignment_id = sda.id
     and sar.clinic_id = sp.clinic_id
     and sar.is_active = true
     and sar.effective_from <= current_date
     and (sar.effective_to is null or sar.effective_to >= current_date)
    join public.clinic_professional_roles cpr
      on cpr.id = sar.professional_role_id
     and cpr.clinic_id = sp.clinic_id
     and cpr.is_active = true
     and cpr.clinical_role = true
    where sp.user_id = auth.uid()
      and sp.clinic_id = p_clinic_id
      and sp.employment_status = 'active'
      and sda.department_id = p_department_id
      and sda.assignment_status = 'active'
      and sda.effective_from <= current_date
      and (sda.effective_to is null or sda.effective_to >= current_date)
      and lower(btrim(sp.professional_role)) in
          (lower(btrim(cpr.role_name)), lower(btrim(cpr.role_code)))
      and exists (
        select 1
        from public.staff_credential_competency_records cr
        where cr.clinic_id = sp.clinic_id
          and cr.staff_profile_id = sp.id
          and lower(btrim(cr.professional_role)) in
              (lower(btrim(cpr.role_name)), lower(btrim(cpr.role_code)))
          and cr.verification_status = 'verified'
          and cr.competency_outcome = 'competent'
          and (cr.expiry_date is null or cr.expiry_date >= current_date)
          and (
            (
              cpr.registration_required = true
              and cr.record_type = 'professional_license'
              and nullif(btrim(sp.professional_registration_number), '') is not null
              and cr.registration_number = sp.professional_registration_number
            )
            or
            (
              cpr.registration_required = false
              and cr.record_type in ('qualification', 'competency_assessment')
            )
          )
          and not exists (
            select 1
            from public.staff_credential_competency_records restriction
            where restriction.clinic_id = sp.clinic_id
              and restriction.staff_profile_id = sp.id
              and lower(btrim(restriction.professional_role)) in
                  (lower(btrim(cpr.role_name)), lower(btrim(cpr.role_code)))
              and restriction.record_type = 'scope_restriction'
              and restriction.verification_status = 'verified'
              and (restriction.expiry_date is null or restriction.expiry_date >= current_date)
          )
      )
  );
$function$;

revoke all on function public.healthos_user_is_authorised_telemedicine_clinician(uuid, uuid) from public;
grant execute on function public.healthos_user_is_authorised_telemedicine_clinician(uuid, uuid) to authenticated;

create or replace function public.healthos_create_telemedicine_session(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_req public.healthos_patient_appointment_requests%rowtype;
  v_session public.healthos_telemedicine_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_req
  from public.healthos_patient_appointment_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Appointment request not found'; end if;
  if v_req.status <> 'accepted' then
    raise exception 'Only accepted appointments can be prepared for remote consultation';
  end if;
  if v_req.visit_type not in ('audio','video') then
    raise exception 'This appointment is not a remote consultation';
  end if;
  if not (
    exists(select 1 from public.clinics c where c.id = v_req.clinic_id and c.owner_user_id = auth.uid())
    or exists(
      select 1 from public.clinic_memberships m
      where m.clinic_id = v_req.clinic_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('owner','admin')
    )
    or (
      v_req.department_id is not null
      and public.healthos_user_is_authorised_telemedicine_clinician(v_req.clinic_id, v_req.department_id)
    )
  ) then raise exception 'Only an authorised, credential-verified clinician or hospital administrator may prepare this consultation'; end if;

  insert into public.healthos_telemedicine_sessions(
    appointment_request_id, clinic_id, department_id, patient_user_id,
    linked_appointment_id, channel, scheduled_at, created_by
  )
  values (
    v_req.id, v_req.clinic_id, v_req.department_id, v_req.patient_user_id,
    v_req.linked_appointment_id, v_req.visit_type, v_req.requested_at, auth.uid()
  )
  on conflict (appointment_request_id) do update set updated_at = now()
  returning * into v_session;

  return jsonb_build_object(
    'id', v_session.id,
    'session_status', v_session.session_status,
    'provider_key', v_session.provider_key,
    'channel', v_session.channel,
    'scheduled_at', v_session.scheduled_at
  );
end;
$function$;

create or replace function public.healthos_complete_telemedicine_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.healthos_telemedicine_sessions where id = p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if not (
    exists(select 1 from public.clinics c where c.id = v_session.clinic_id and c.owner_user_id = auth.uid())
    or exists(
      select 1 from public.clinic_memberships m
      where m.clinic_id = v_session.clinic_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('owner','admin')
    )
    or (
      v_session.department_id is not null
      and public.healthos_user_is_authorised_telemedicine_clinician(v_session.clinic_id, v_session.department_id)
    )
  ) then raise exception 'Not authorised to complete this consultation'; end if;

  update public.healthos_telemedicine_sessions
  set session_status = 'completed', completed_at = now(), updated_at = now()
  where id = p_session_id and session_status in ('awaiting_provider','ready','active');
  return found;
end;
$function$;

create or replace function public.healthos_get_department_telemedicine_sessions(
  p_clinic_id uuid, p_department_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not (
    exists(select 1 from public.clinics c where c.id = p_clinic_id and c.owner_user_id = auth.uid())
    or exists(
      select 1 from public.clinic_memberships m
      where m.clinic_id = p_clinic_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('owner','admin')
    )
    or public.healthos_user_is_authorised_telemedicine_clinician(p_clinic_id, p_department_id)
  ) then raise exception 'Not authorised for this department'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',s.id,'appointment_request_id',s.appointment_request_id,'channel',s.channel,
      'session_status',s.session_status,'provider_key',s.provider_key,'scheduled_at',s.scheduled_at,
      'patient_user_id',s.patient_user_id
    ) order by s.scheduled_at)
    from public.healthos_telemedicine_sessions s
    where s.clinic_id = p_clinic_id and s.department_id = p_department_id
      and s.session_status not in ('cancelled','expired')
  ), '[]'::jsonb);
end;
$function$;

create or replace function public.healthos_get_clinic_telemedicine_sessions(p_clinic_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_rows jsonb;
  v_profile uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select m.role into v_role
  from public.clinic_memberships m
  where m.clinic_id = p_clinic_id and m.user_id = v_uid and m.status = 'active'
  limit 1;
  select sp.id into v_profile
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid and sp.employment_status = 'active'
  limit 1;

  if not exists(select 1 from public.clinics c where c.id = p_clinic_id and c.owner_user_id = v_uid)
     and coalesce(v_role,'') not in ('owner','admin')
     and not exists(
       select 1 from public.healthos_telemedicine_sessions s
       where s.clinic_id = p_clinic_id and s.department_id is not null
         and public.healthos_user_is_authorised_telemedicine_clinician(p_clinic_id, s.department_id)
     )
  then raise exception 'Not authorised for this clinic telemedicine workspace' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'appointment_request_id',s.appointment_request_id,'department_id',s.department_id,
    'channel',s.channel,'session_status',s.session_status,'provider_key',s.provider_key,
    'scheduled_at',s.scheduled_at,'created_at',s.created_at,
    'consent_status',(select c.consent_status from public.healthos_telemedicine_consents c
                     where c.session_id = s.id order by c.created_at desc limit 1)
  ) order by s.scheduled_at desc), '[]'::jsonb)
  into v_rows
  from public.healthos_telemedicine_sessions s
  where s.clinic_id = p_clinic_id
    and (exists(select 1 from public.clinics c where c.id = p_clinic_id and c.owner_user_id = v_uid)
      or coalesce(v_role,'') in ('owner','admin')
      or (s.department_id is not null
        and public.healthos_user_is_authorised_telemedicine_clinician(p_clinic_id, s.department_id)))
    and s.session_status not in ('cancelled','expired');

  return jsonb_build_object('sessions', v_rows);
end;
$function$;

create or replace function public.healthos_get_telemedicine_workspace(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_session public.healthos_telemedicine_sessions%rowtype;
  v_authorised boolean := false;
  v_consents jsonb;
  v_observations jsonb;
  v_messages jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_session from public.healthos_telemedicine_sessions where id = p_session_id;
  if not found then raise exception 'Consultation session not found'; end if;

  if v_session.patient_user_id = auth.uid() then
    v_authorised := true;
  else
    select (
      exists(select 1 from public.clinics c where c.id = v_session.clinic_id and c.owner_user_id = auth.uid())
      or exists(select 1 from public.clinic_memberships m
        where m.clinic_id = v_session.clinic_id and m.user_id = auth.uid()
          and m.status = 'active' and m.role in ('owner','admin'))
      or (v_session.department_id is not null
        and public.healthos_user_is_authorised_telemedicine_clinician(v_session.clinic_id, v_session.department_id))
    ) into v_authorised;
  end if;
  if not v_authorised then raise exception 'Not authorised for this consultation' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb)
    into v_consents from public.healthos_telemedicine_consents c where c.session_id = p_session_id;
  select coalesce(jsonb_agg(to_jsonb(o) order by o.observed_at desc),'[]'::jsonb)
    into v_observations from public.healthos_remote_observations o where o.session_id = p_session_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.id,'sender_user_id',m.sender_user_id,'message_text',m.message_text,'created_at',m.created_at
  ) order by m.created_at),'[]'::jsonb)
    into v_messages from public.healthos_telemedicine_messages m where m.session_id = p_session_id;

  return jsonb_build_object(
    'session',jsonb_build_object(
      'id',v_session.id,'clinic_id',v_session.clinic_id,'department_id',v_session.department_id,
      'channel',v_session.channel,'session_status',v_session.session_status,'provider_key',v_session.provider_key,
      'scheduled_at',v_session.scheduled_at,
      'provider_connected',v_session.provider_key <> 'unconfigured'
        and v_session.session_status in ('ready','active')
    ),
    'consents',v_consents,'observations',v_observations,'messages',v_messages
  );
end;
$function$;

create or replace function public.healthos_mark_telemedicine_session_active(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_session public.healthos_telemedicine_sessions%rowtype;
  v_consent_status text;
  v_revoked_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select * into v_session from public.healthos_telemedicine_sessions where id = p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if v_session.provider_key <> 'daily' or v_session.provider_meeting_reference is null then
    raise exception 'A configured video provider is required';
  end if;
  select c.consent_status,c.revoked_at into v_consent_status,v_revoked_at
  from public.healthos_telemedicine_consents c
  where c.session_id = p_session_id order by c.created_at desc limit 1;
  if v_consent_status is distinct from 'granted' or v_revoked_at is not null then
    raise exception 'Current patient consent is required before consultation';
  end if;
  if not (
    exists(select 1 from public.clinics c where c.id = v_session.clinic_id and c.owner_user_id = auth.uid())
    or exists(select 1 from public.clinic_memberships m
      where m.clinic_id = v_session.clinic_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('owner','admin'))
    or (v_session.department_id is not null
      and public.healthos_user_is_authorised_telemedicine_clinician(v_session.clinic_id, v_session.department_id))
  ) then raise exception 'Not authorised to activate this consultation'; end if;

  update public.healthos_telemedicine_sessions
  set session_status = 'active', updated_at = now()
  where id = p_session_id and session_status = 'ready';
  return found;
end;
$function$;

create or replace function public.healthos_send_telemedicine_message(
  p_session_id uuid, p_message_text text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_session public.healthos_telemedicine_sessions%rowtype;
  v_id uuid;
  v_staff boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if length(btrim(coalesce(p_message_text,''))) not between 1 and 4000 then
    raise exception 'Message must contain 1 to 4000 characters';
  end if;
  select * into v_session from public.healthos_telemedicine_sessions where id = p_session_id;
  if not found then raise exception 'Consultation session not found'; end if;

  if v_session.patient_user_id = auth.uid() then
    if v_session.session_status not in ('ready','active','completed') then
      raise exception 'Messaging is not open for this session';
    end if;
  else
    select (
      exists(select 1 from public.clinics c where c.id = v_session.clinic_id and c.owner_user_id = auth.uid())
      or exists(select 1 from public.clinic_memberships m
        where m.clinic_id = v_session.clinic_id and m.user_id = auth.uid()
          and m.status = 'active' and m.role in ('owner','admin'))
      or (v_session.department_id is not null
        and public.healthos_user_is_authorised_telemedicine_clinician(v_session.clinic_id, v_session.department_id))
    ) into v_staff;
    if not v_staff then raise exception 'Not authorised for this consultation'; end if;
    if v_session.session_status not in ('ready','active','completed') then
      raise exception 'Messaging is not open for this session';
    end if;
  end if;

  insert into public.healthos_telemedicine_messages(
    session_id,clinic_id,patient_user_id,sender_user_id,message_text
  )
  values(v_session.id,v_session.clinic_id,v_session.patient_user_id,auth.uid(),btrim(p_message_text))
  returning id into v_id;
  return jsonb_build_object('success',true,'message_id',v_id,'created_at',now());
end;
$function$;

-- Preserve the existing patient, owner and administrator access grants.
-- Existing RPC execute grants are intentionally retained.
