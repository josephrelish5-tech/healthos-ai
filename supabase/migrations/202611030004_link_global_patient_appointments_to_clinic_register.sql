
alter table public.healthos_patient_appointment_requests
 add column if not exists linked_appointment_id uuid references public.appointments(id) on delete set null,
 add column if not exists linked_patient_record_id uuid references public.patients(id) on delete set null;

create or replace function public.healthos_accept_patient_appointment_request(
 p_request_id uuid,
 p_patient_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_request public.healthos_patient_appointment_requests%rowtype;
 v_appointment_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_request
 from public.healthos_patient_appointment_requests
 where id = p_request_id
 for update;
 if not found then raise exception 'Appointment request not found'; end if;
 if not (
  exists(select 1 from public.clinics c where c.id=v_request.clinic_id and c.owner_user_id=auth.uid())
  or exists(select 1 from public.clinic_memberships m where m.clinic_id=v_request.clinic_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin'))
 ) then raise exception 'You are not authorised to accept requests for this hospital'; end if;
 if v_request.status <> 'requested' then raise exception 'This request has already been reviewed'; end if;
 if not exists(select 1 from public.patients p where p.id=p_patient_id and p.clinic_id=v_request.clinic_id) then
  raise exception 'Select a patient record belonging to this hospital';
 end if;
 if not exists(select 1 from public.healthos_patient_hospital_links l where l.patient_user_id=v_request.patient_user_id and l.clinic_id=v_request.clinic_id and l.status='verified') then
  raise exception 'The patient hospital connection is no longer verified';
 end if;
 insert into public.appointments(clinic_id,patient_id,scheduled_at,reason,notes,status,created_by)
 values(v_request.clinic_id,p_patient_id,v_request.requested_at,v_request.reason,
        nullif(v_request.patient_note,''),'scheduled',auth.uid())
 returning id into v_appointment_id;
 update public.healthos_patient_appointment_requests
 set status='accepted',reviewed_at=now(),reviewed_by=auth.uid(),
     linked_appointment_id=v_appointment_id,linked_patient_record_id=p_patient_id,updated_at=now()
 where id=p_request_id;
 return v_appointment_id;
end;
$$;
revoke all on function public.healthos_accept_patient_appointment_request(uuid,uuid) from public;
grant execute on function public.healthos_accept_patient_appointment_request(uuid,uuid) to authenticated;
