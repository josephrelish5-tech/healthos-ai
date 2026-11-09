-- Enforce latest consent state so a later revocation overrides any earlier grant.
create or replace function public.healthos_submit_remote_observation(p_session_id uuid,p_metric text,p_numeric_value numeric,p_unit text,p_patient_note text default null)
returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype; v_id uuid; v_min numeric; v_max numeric; v_consent_status text; v_revoked_at timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select * into v_session from public.healthos_telemedicine_sessions where id=p_session_id and patient_user_id=auth.uid();
 if not found then raise exception 'Session not found for this patient' using errcode='42501'; end if;
 if v_session.session_status not in ('ready','active') then raise exception 'Remote observations can only be submitted for a prepared or active session'; end if;
 select c.consent_status,c.revoked_at into v_consent_status,v_revoked_at from public.healthos_telemedicine_consents c where c.session_id=p_session_id and c.patient_user_id=auth.uid() order by c.created_at desc limit 1;
 if v_consent_status is distinct from 'granted' or v_revoked_at is not null then raise exception 'Current patient consent for remote monitoring is required' using errcode='42501'; end if;
 if p_metric not in ('blood_pressure_systolic','blood_pressure_diastolic','heart_rate','temperature','oxygen_saturation','blood_glucose','weight') then raise exception 'Unsupported observation type'; end if;
 if p_numeric_value is null or length(btrim(coalesce(p_unit,'')))<1 or length(coalesce(p_patient_note,''))>1000 then raise exception 'Observation value, unit and note are invalid'; end if;
 if p_metric='blood_pressure_systolic' then v_min:=40;v_max:=300; elsif p_metric='blood_pressure_diastolic' then v_min:=20;v_max:=200; elsif p_metric='heart_rate' then v_min:=15;v_max:=300; elsif p_metric='temperature' then v_min:=25;v_max:=45; elsif p_metric='oxygen_saturation' then v_min:=40;v_max:=100; elsif p_metric='blood_glucose' then v_min:=0.1;v_max:=1500; else v_min:=0.2;v_max:=500; end if;
 if p_numeric_value<v_min or p_numeric_value>v_max then raise exception 'Observation is outside the accepted entry range; verify the measurement and unit'; end if;
 insert into public.healthos_remote_observations(session_id,clinic_id,patient_user_id,metric,numeric_value,unit,patient_note) values(v_session.id,v_session.clinic_id,auth.uid(),p_metric,p_numeric_value,btrim(p_unit),nullif(btrim(coalesce(p_patient_note,'')),'')) returning id into v_id;
 return jsonb_build_object('success',true,'observation_id',v_id,'clinical_interpretation','not_provided');
end;$function$;
create or replace function public.healthos_mark_telemedicine_session_active(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype; v_consent_status text; v_revoked_at timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select * into v_session from public.healthos_telemedicine_sessions where id=p_session_id for update;
 if not found then raise exception 'Session not found'; end if;
 if v_session.provider_key<>'daily' or v_session.provider_meeting_reference is null then raise exception 'A configured video provider is required'; end if;
 select c.consent_status,c.revoked_at into v_consent_status,v_revoked_at from public.healthos_telemedicine_consents c where c.session_id=p_session_id order by c.created_at desc limit 1;
 if v_consent_status is distinct from 'granted' or v_revoked_at is not null then raise exception 'Current patient consent is required before consultation'; end if;
 if not (exists(select 1 from public.clinics c where c.id=v_session.clinic_id and c.owner_user_id=auth.uid()) or exists(select 1 from public.clinic_memberships m where m.clinic_id=v_session.clinic_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')) or (v_session.department_id is not null and public.healthos_user_assigned_to_department(v_session.clinic_id,v_session.department_id))) then raise exception 'Not authorised to activate this consultation'; end if;
 update public.healthos_telemedicine_sessions set session_status='active',updated_at=now() where id=p_session_id and session_status='ready'; return found;
end;$function$;
revoke all on function public.healthos_submit_remote_observation(uuid,text,numeric,text,text) from public,anon;
grant execute on function public.healthos_submit_remote_observation(uuid,text,numeric,text,text) to authenticated;
revoke all on function public.healthos_mark_telemedicine_session_active(uuid) from public,anon;
grant execute on function public.healthos_mark_telemedicine_session_active(uuid) to authenticated;
