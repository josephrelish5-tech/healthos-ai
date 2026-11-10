-- Telemedicine participant/clinician boundary hardening.
-- Hospital owners/admins retain operational oversight and scheduling rights,
-- but only the patient or a currently credential-verified clinician assigned
-- to the consultation department may access clinical workspace data or join.
-- This migration does not alter the shared staff/department authorisation model.

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
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_session
  from public.healthos_telemedicine_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Consultation session not found';
  end if;

  v_authorised :=
    v_session.patient_user_id = auth.uid()
    or (
      v_session.department_id is not null
      and public.healthos_user_is_authorised_telemedicine_clinician(
        v_session.clinic_id, v_session.department_id
      )
    );

  if not v_authorised then
    raise exception 'Only the patient or a verified assigned clinician may access this clinical workspace'
      using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb)
    into v_consents
    from public.healthos_telemedicine_consents c
    where c.session_id = p_session_id;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.observed_at desc),'[]'::jsonb)
    into v_observations
    from public.healthos_remote_observations o
    where o.session_id = p_session_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.id,'sender_user_id',m.sender_user_id,
    'message_text',m.message_text,'created_at',m.created_at
  ) order by m.created_at),'[]'::jsonb)
    into v_messages
    from public.healthos_telemedicine_messages m
    where m.session_id = p_session_id;

  return jsonb_build_object(
    'session',jsonb_build_object(
      'id',v_session.id,'clinic_id',v_session.clinic_id,
      'department_id',v_session.department_id,'channel',v_session.channel,
      'session_status',v_session.session_status,'provider_key',v_session.provider_key,
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
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_session
  from public.healthos_telemedicine_sessions
  where id = p_session_id
  for update;

  if not found then raise exception 'Session not found'; end if;

  if v_session.department_id is null
     or not public.healthos_user_is_authorised_telemedicine_clinician(
       v_session.clinic_id, v_session.department_id
     ) then
    raise exception 'Only a verified clinician assigned to this department may activate a consultation'
      using errcode = '42501';
  end if;

  if v_session.provider_key <> 'daily'
     or v_session.provider_meeting_reference is null then
    raise exception 'A configured video provider is required';
  end if;

  select c.consent_status,c.revoked_at
    into v_consent_status,v_revoked_at
    from public.healthos_telemedicine_consents c
    where c.session_id = p_session_id
    order by c.created_at desc
    limit 1;

  if v_consent_status is distinct from 'granted' or v_revoked_at is not null then
    raise exception 'Current patient consent is required before consultation';
  end if;

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
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if length(btrim(coalesce(p_message_text,''))) not between 1 and 4000 then
    raise exception 'Message must contain 1 to 4000 characters';
  end if;

  select * into v_session
  from public.healthos_telemedicine_sessions
  where id = p_session_id;

  if not found then raise exception 'Consultation session not found'; end if;

  if v_session.patient_user_id <> auth.uid()
     and (
       v_session.department_id is null
       or not public.healthos_user_is_authorised_telemedicine_clinician(
         v_session.clinic_id, v_session.department_id
       )
     ) then
    raise exception 'Only the patient or a verified assigned clinician may message this consultation'
      using errcode = '42501';
  end if;

  if v_session.session_status not in ('ready','active','completed') then
    raise exception 'Messaging is not open for this session';
  end if;

  insert into public.healthos_telemedicine_messages(
    session_id,clinic_id,patient_user_id,sender_user_id,message_text
  )
  values(
    v_session.id,v_session.clinic_id,v_session.patient_user_id,
    auth.uid(),btrim(p_message_text)
  );

  return jsonb_build_object('success',true,'created_at',now());
end;
$function$;

-- Existing EXECUTE grants are preserved by CREATE OR REPLACE.
