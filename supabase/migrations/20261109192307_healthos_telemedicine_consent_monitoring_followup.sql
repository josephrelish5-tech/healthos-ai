-- HealthOS Telemedicine consent, remote observations and secure follow-up.
create table if not exists public.healthos_telemedicine_consents (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.healthos_telemedicine_sessions(id) on delete cascade,
 clinic_id uuid not null references public.clinics(id) on delete cascade, patient_user_id uuid not null references auth.users(id) on delete cascade,
 consent_version text not null default 'telemedicine-consent-v1', consent_status text not null check(consent_status in ('granted','revoked')),
 consented_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
 constraint healthos_telemedicine_consent_state_check check ((consent_status='granted' and consented_at is not null and revoked_at is null) or (consent_status='revoked' and revoked_at is not null))
);
create index if not exists healthos_telemedicine_consents_session_idx on public.healthos_telemedicine_consents(session_id,created_at desc);
create table if not exists public.healthos_remote_observations (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.healthos_telemedicine_sessions(id) on delete cascade,
 clinic_id uuid not null references public.clinics(id) on delete cascade, patient_user_id uuid not null references auth.users(id) on delete cascade,
 metric text not null check(metric in ('blood_pressure_systolic','blood_pressure_diastolic','heart_rate','temperature','oxygen_saturation','blood_glucose','weight')),
 numeric_value numeric(12,3) not null, unit text not null, patient_note text, observed_at timestamptz not null default now(), created_at timestamptz not null default now(),
 constraint healthos_remote_observation_note_len check(length(coalesce(patient_note,''))<=1000)
);
create index if not exists healthos_remote_observations_session_idx on public.healthos_remote_observations(session_id,observed_at desc);
create table if not exists public.healthos_telemedicine_messages (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.healthos_telemedicine_sessions(id) on delete cascade,
 clinic_id uuid not null references public.clinics(id) on delete cascade, patient_user_id uuid not null references auth.users(id) on delete cascade,
 sender_user_id uuid not null references auth.users(id), message_text text not null check(length(btrim(message_text)) between 1 and 4000), created_at timestamptz not null default now()
);
create index if not exists healthos_telemedicine_messages_session_idx on public.healthos_telemedicine_messages(session_id,created_at);
alter table public.healthos_telemedicine_consents enable row level security;
alter table public.healthos_remote_observations enable row level security;
alter table public.healthos_telemedicine_messages enable row level security;
revoke all on public.healthos_telemedicine_consents,public.healthos_remote_observations,public.healthos_telemedicine_messages from public,anon,authenticated;
create or replace function public.healthos_patient_telemedicine_consent(p_session_id uuid,p_grant boolean)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype; v_status text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select * into v_session from public.healthos_telemedicine_sessions where id=p_session_id and patient_user_id=auth.uid() for update;
 if not found then raise exception 'Telemedicine session not found for this patient' using errcode='42501'; end if;
 if v_session.session_status in ('completed','cancelled','expired') then raise exception 'Consent cannot be changed for a closed consultation'; end if;
 if p_grant then
  insert into public.healthos_telemedicine_consents(session_id,clinic_id,patient_user_id,consent_status,consented_at,revoked_at) values(v_session.id,v_session.clinic_id,auth.uid(),'granted',now(),null); v_status:='granted';
 else
  insert into public.healthos_telemedicine_consents(session_id,clinic_id,patient_user_id,consent_status,consented_at,revoked_at) values(v_session.id,v_session.clinic_id,auth.uid(),'revoked',null,now()); v_status:='revoked';
 end if;
 return jsonb_build_object('success',true,'consent_status',v_status,'session_id',v_session.id,'recorded_at',now());
end;$function$;
create or replace function public.healthos_submit_remote_observation(p_session_id uuid,p_metric text,p_numeric_value numeric,p_unit text,p_patient_note text default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype; v_id uuid; v_min numeric; v_max numeric;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select * into v_session from public.healthos_telemedicine_sessions where id=p_session_id and patient_user_id=auth.uid();
 if not found then raise exception 'Session not found for this patient' using errcode='42501'; end if;
 if v_session.session_status not in ('ready','active') then raise exception 'Remote observations can only be submitted for a prepared or active session'; end if;
 if not exists(select 1 from public.healthos_telemedicine_consents c where c.session_id=p_session_id and c.patient_user_id=auth.uid() and c.consent_status='granted' and c.revoked_at is null) then raise exception 'Patient consent for remote monitoring is required' using errcode='42501'; end if;
 if p_metric not in ('blood_pressure_systolic','blood_pressure_diastolic','heart_rate','temperature','oxygen_saturation','blood_glucose','weight') then raise exception 'Unsupported observation type'; end if;
 if p_numeric_value is null or length(btrim(coalesce(p_unit,'')))<1 or length(coalesce(p_patient_note,''))>1000 then raise exception 'Observation value, unit and note are invalid'; end if;
 if p_metric='blood_pressure_systolic' then v_min:=40;v_max:=300; elsif p_metric='blood_pressure_diastolic' then v_min:=20;v_max:=200; elsif p_metric='heart_rate' then v_min:=15;v_max:=300; elsif p_metric='temperature' then v_min:=25;v_max:=45; elsif p_metric='oxygen_saturation' then v_min:=40;v_max:=100; elsif p_metric='blood_glucose' then v_min:=0.1;v_max:=1500; else v_min:=0.2;v_max:=500; end if;
 if p_numeric_value<v_min or p_numeric_value>v_max then raise exception 'Observation is outside the accepted entry range; verify the measurement and unit'; end if;
 insert into public.healthos_remote_observations(session_id,clinic_id,patient_user_id,metric,numeric_value,unit,patient_note) values(v_session.id,v_session.clinic_id,auth.uid(),p_metric,p_numeric_value,btrim(p_unit),nullif(btrim(coalesce(p_patient_note,'')),'')) returning id into v_id;
 return jsonb_build_object('success',true,'observation_id',v_id,'clinical_interpretation','not_provided');
end;$function$;
create or replace function public.healthos_send_telemedicine_message(p_session_id uuid,p_message_text text)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype; v_id uuid; v_staff boolean:=false;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if length(btrim(coalesce(p_message_text,''))) not between 1 and 4000 then raise exception 'Message must contain 1 to 4000 characters'; end if;
 select * into v_session from public.healthos_telemedicine_sessions where id=p_session_id;
 if not found then raise exception 'Consultation session not found'; end if;
 if v_session.patient_user_id=auth.uid() then
  if v_session.session_status not in ('ready','active','completed') then raise exception 'Messaging is not open for this session'; end if;
 else
  select exists(select 1 from public.clinics c where c.id=v_session.clinic_id and c.owner_user_id=auth.uid()
   union all select 1 from public.clinic_memberships m where m.clinic_id=v_session.clinic_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')
   union all select 1 where v_session.department_id is not null and public.healthos_user_assigned_to_department(v_session.clinic_id,v_session.department_id)) into v_staff;
  if not v_staff then raise exception 'Not authorised for this consultation'; end if;
  if v_session.session_status not in ('ready','active','completed') then raise exception 'Messaging is not open for this session'; end if;
 end if;
 insert into public.healthos_telemedicine_messages(session_id,clinic_id,patient_user_id,sender_user_id,message_text) values(v_session.id,v_session.clinic_id,v_session.patient_user_id,auth.uid(),btrim(p_message_text)) returning id into v_id;
 return jsonb_build_object('success',true,'message_id',v_id,'created_at',now());
end;$function$;
create or replace function public.healthos_get_telemedicine_workspace(p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype; v_authorised boolean:=false; v_consents jsonb;v_observations jsonb;v_messages jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select * into v_session from public.healthos_telemedicine_sessions where id=p_session_id;
 if not found then raise exception 'Consultation session not found'; end if;
 if v_session.patient_user_id=auth.uid() then v_authorised:=true; else
  select exists(select 1 from public.clinics c where c.id=v_session.clinic_id and c.owner_user_id=auth.uid()
   union all select 1 from public.clinic_memberships m where m.clinic_id=v_session.clinic_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')
   union all select 1 where v_session.department_id is not null and public.healthos_user_assigned_to_department(v_session.clinic_id,v_session.department_id)) into v_authorised;
 end if;
 if not v_authorised then raise exception 'Not authorised for this consultation' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb) into v_consents from public.healthos_telemedicine_consents c where c.session_id=p_session_id;
 select coalesce(jsonb_agg(to_jsonb(o) order by o.observed_at desc),'[]'::jsonb) into v_observations from public.healthos_remote_observations o where o.session_id=p_session_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'sender_user_id',m.sender_user_id,'message_text',m.message_text,'created_at',m.created_at) order by m.created_at),'[]'::jsonb) into v_messages from public.healthos_telemedicine_messages m where m.session_id=p_session_id;
 return jsonb_build_object('session',jsonb_build_object('id',v_session.id,'clinic_id',v_session.clinic_id,'department_id',v_session.department_id,'channel',v_session.channel,'session_status',v_session.session_status,'provider_key',v_session.provider_key,'scheduled_at',v_session.scheduled_at,'provider_connected',v_session.provider_key<>'unconfigured' and v_session.session_status in ('ready','active')),'consents',v_consents,'observations',v_observations,'messages',v_messages);
end;$function$;
revoke all on function public.healthos_patient_telemedicine_consent(uuid,boolean) from public,anon;
revoke all on function public.healthos_submit_remote_observation(uuid,text,numeric,text,text) from public,anon;
revoke all on function public.healthos_send_telemedicine_message(uuid,text) from public,anon;
revoke all on function public.healthos_get_telemedicine_workspace(uuid) from public,anon;
grant execute on function public.healthos_patient_telemedicine_consent(uuid,boolean) to authenticated;
grant execute on function public.healthos_submit_remote_observation(uuid,text,numeric,text,text) to authenticated;
grant execute on function public.healthos_send_telemedicine_message(uuid,text) to authenticated;
grant execute on function public.healthos_get_telemedicine_workspace(uuid) to authenticated;
