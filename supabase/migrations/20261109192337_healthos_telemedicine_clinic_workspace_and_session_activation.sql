-- Telemedicine clinic read model and session activation.
create or replace function public.healthos_get_clinic_telemedicine_sessions(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_uid uuid:=auth.uid(); v_role text; v_rows jsonb; v_profile uuid;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select m.role into v_role from public.clinic_memberships m where m.clinic_id=p_clinic_id and m.user_id=v_uid and m.status='active' limit 1;
 select sp.id into v_profile from public.staff_profiles sp where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active' limit 1;
 if not exists(select 1 from public.clinics c where c.id=p_clinic_id and c.owner_user_id=v_uid) and coalesce(v_role,'') not in ('owner','admin')
 and not exists(select 1 from public.staff_department_assignments a where a.clinic_id=p_clinic_id and a.staff_profile_id=v_profile and a.assignment_status='active' and a.effective_from<=current_date and (a.effective_to is null or a.effective_to>=current_date))
 then raise exception 'Not authorised for this clinic telemedicine workspace' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'appointment_request_id',s.appointment_request_id,'department_id',s.department_id,'channel',s.channel,'session_status',s.session_status,'provider_key',s.provider_key,'scheduled_at',s.scheduled_at,'created_at',s.created_at,'consent_status',(select c.consent_status from public.healthos_telemedicine_consents c where c.session_id=s.id order by c.created_at desc limit 1)) order by s.scheduled_at desc),'[]'::jsonb) into v_rows
 from public.healthos_telemedicine_sessions s where s.clinic_id=p_clinic_id and (exists(select 1 from public.clinics c where c.id=p_clinic_id and c.owner_user_id=v_uid) or coalesce(v_role,'') in ('owner','admin') or (s.department_id is not null and public.healthos_user_assigned_to_department(p_clinic_id,s.department_id))) and s.session_status not in ('cancelled','expired');
 return jsonb_build_object('sessions',v_rows);
end;$function$;
create or replace function public.healthos_mark_telemedicine_session_active(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_session public.healthos_telemedicine_sessions%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 select * into v_session from public.healthos_telemedicine_sessions where id=p_session_id for update;
 if not found then raise exception 'Session not found'; end if;
 if v_session.provider_key<>'daily' or v_session.provider_meeting_reference is null then raise exception 'A configured video provider is required'; end if;
 if not exists(select 1 from public.healthos_telemedicine_consents c where c.session_id=p_session_id and c.consent_status='granted' and c.revoked_at is null) then raise exception 'Current patient consent is required before consultation'; end if;
 if not (exists(select 1 from public.clinics c where c.id=v_session.clinic_id and c.owner_user_id=auth.uid()) or exists(select 1 from public.clinic_memberships m where m.clinic_id=v_session.clinic_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')) or (v_session.department_id is not null and public.healthos_user_assigned_to_department(v_session.clinic_id,v_session.department_id))) then raise exception 'Not authorised to activate this consultation'; end if;
 update public.healthos_telemedicine_sessions set session_status='active',updated_at=now() where id=p_session_id and session_status='ready'; return found;
end;$function$;
revoke all on function public.healthos_get_clinic_telemedicine_sessions(uuid) from public,anon;
revoke all on function public.healthos_mark_telemedicine_session_active(uuid) from public,anon;
grant execute on function public.healthos_get_clinic_telemedicine_sessions(uuid) to authenticated;
grant execute on function public.healthos_mark_telemedicine_session_active(uuid) to authenticated;
