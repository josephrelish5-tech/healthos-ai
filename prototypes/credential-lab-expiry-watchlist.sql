-- HealthOS Credential Lab ONLY: credential expiry watchlist.
-- Read-only: does not alter credential status or authorise clinical practice.
-- Apply only to project efhifeqtraibxvzozmob (HealthOS-Telemedicine-Test).

create or replace function credential_lab.get_expiry_watchlist(
 p_hospital_id uuid,
 p_days_ahead integer default 60
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, credential_lab, auth
as $$
declare v_actor uuid := auth.uid(); v_result jsonb;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_days_ahead is null or p_days_ahead < 0 or p_days_ahead > 365 then
   raise exception 'Expiry window must be between 0 and 365 days' using errcode='22023';
 end if;
 if not exists (
   select 1 from credential_lab.verifier_assignments va
   where va.hospital_id=p_hospital_id and va.verifier_user_id=v_actor
     and va.is_active and va.verifier_role in ('credential_verifier','hospital_owner')
 ) then raise exception 'Only an active hospital verifier or owner can view credential expiry records' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'credential_id',cs.id,'staff_id',cs.staff_id,'staff_code',s.staff_code,
   'staff_name',s.display_name,'professional_role_code',s.professional_role_code,
   'record_type',cs.record_type,'record_title',cs.record_title,'issuing_body',cs.issuing_body,
   'registration_number',cs.registration_number,'expiry_date',cs.expiry_date,
   'days_until_expiry',(cs.expiry_date-current_date),
   'expiry_state',case when cs.expiry_date<current_date then 'expired'
     when cs.expiry_date=current_date then 'expires_today' else 'expiring_soon' end
 ) order by cs.expiry_date asc),'[]'::jsonb)
 into v_result
 from credential_lab.credential_submissions cs
 join credential_lab.staff s on s.id=cs.staff_id
 where cs.hospital_id=p_hospital_id and cs.status='verified'
   and cs.expiry_date is not null and cs.expiry_date<=current_date+p_days_ahead;
 return v_result;
end;
$$;
revoke all on function credential_lab.get_expiry_watchlist(uuid,integer) from public,anon,authenticated;
grant execute on function credential_lab.get_expiry_watchlist(uuid,integer) to authenticated;

create or replace function public.healthos_credential_get_expiry_watchlist(
 p_hospital_id uuid,p_days_ahead integer default 60
) returns jsonb
language sql security invoker
set search_path=pg_catalog,credential_lab
as $$ select credential_lab.get_expiry_watchlist(p_hospital_id,p_days_ahead); $$;
revoke all on function public.healthos_credential_get_expiry_watchlist(uuid,integer) from public,anon;
grant execute on function public.healthos_credential_get_expiry_watchlist(uuid,integer) to authenticated;
