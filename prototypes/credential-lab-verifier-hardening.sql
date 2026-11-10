-- HealthOS Credential Lab only.
-- Apply only to Supabase project efhifeqtraibxvzozmob (HealthOS-Telemedicine-Test).
-- DO NOT apply to the production HealthOS project.
-- Hardens verifier assignment: target must be active synthetic staff in the same hospital,
-- and the last active hospital owner cannot be deactivated.

create or replace function credential_lab.manage_verifier(
 p_hospital_id uuid, p_verifier_user_id uuid, p_verifier_role text, p_active boolean
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, credential_lab, auth
as $$
declare v_actor uuid := auth.uid(); v_action text; v_owner_count integer;
begin
 if v_actor is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_verifier_role not in ('credential_verifier','hospital_owner') then
   raise exception 'Invalid verifier role' using errcode='22023';
 end if;
 if not exists (
   select 1 from credential_lab.verifier_assignments va
   where va.hospital_id=p_hospital_id and va.verifier_user_id=v_actor
     and va.verifier_role='hospital_owner' and va.is_active
 ) then raise exception 'Only an active hospital owner can manage verifiers' using errcode='42501'; end if;
 if not exists (
   select 1 from credential_lab.staff s
   where s.hospital_id=p_hospital_id and s.synthetic_user_id=p_verifier_user_id and s.is_active
 ) then raise exception 'Target must be an active synthetic staff member in this hospital' using errcode='42501'; end if;
 if p_verifier_user_id=v_actor and p_verifier_role='credential_verifier' then
   raise exception 'Hospital owner cannot create a self-verification assignment' using errcode='42501';
 end if;
 if not p_active and p_verifier_role='hospital_owner' then
   select count(*) into v_owner_count from credential_lab.verifier_assignments
   where hospital_id=p_hospital_id and verifier_role='hospital_owner' and is_active;
   if v_owner_count <= 1 and exists (
     select 1 from credential_lab.verifier_assignments
     where hospital_id=p_hospital_id and verifier_user_id=p_verifier_user_id
       and verifier_role='hospital_owner' and is_active
   ) then raise exception 'Cannot deactivate the last active hospital owner' using errcode='55000'; end if;
 end if;
 if p_active then
   insert into credential_lab.verifier_assignments(hospital_id,verifier_user_id,verifier_role,is_active)
   values(p_hospital_id,p_verifier_user_id,p_verifier_role,true)
   on conflict(hospital_id,verifier_user_id,verifier_role)
   do update set is_active=true;
   v_action := 'appointed';
 else
   update credential_lab.verifier_assignments
   set is_active=false
   where hospital_id=p_hospital_id and verifier_user_id=p_verifier_user_id
     and verifier_role=p_verifier_role;
   v_action := 'deactivated';
 end if;
 insert into credential_lab.verifier_assignment_events(hospital_id,verifier_user_id,changed_by,action,role)
 values(p_hospital_id,p_verifier_user_id,v_actor,v_action,p_verifier_role);
 return jsonb_build_object('hospital_id',p_hospital_id,'verifier_user_id',p_verifier_user_id,
   'role',p_verifier_role,'active',p_active,'action',v_action);
end;
$$;
