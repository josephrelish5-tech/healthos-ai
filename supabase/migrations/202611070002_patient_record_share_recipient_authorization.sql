create table if not exists public.patient_record_share_access_requests (
 id uuid primary key default gen_random_uuid(),
 share_id uuid not null references public.patient_record_shares(id) on delete cascade,
 source_clinic_id uuid not null references public.clinics(id) on delete cascade,
 recipient_clinic_id uuid not null references public.clinics(id) on delete cascade,
 patient_user_id uuid not null references auth.users(id) on delete cascade,
 requested_by uuid not null references auth.users(id),
 status text not null default 'awaiting_patient_approval'
 check (status in ('awaiting_patient_approval','approved','rejected','revoked','expired')),
 requested_at timestamptz not null default now(), responded_at timestamptz,
 patient_note text, review_note text, check (source_clinic_id <> recipient_clinic_id)
);
create index if not exists patient_record_share_access_requests_patient_idx on public.patient_record_share_access_requests(patient_user_id,status,requested_at desc);
create index if not exists patient_record_share_access_requests_recipient_idx on public.patient_record_share_access_requests(recipient_clinic_id,status,requested_at desc);
create unique index if not exists patient_record_share_access_pending_unique on public.patient_record_share_access_requests(share_id,recipient_clinic_id) where status='awaiting_patient_approval';
alter table public.patient_record_share_access_requests enable row level security;
drop policy if exists patient_record_share_access_patient_read on public.patient_record_share_access_requests;
create policy patient_record_share_access_patient_read on public.patient_record_share_access_requests for select to authenticated using (patient_user_id=auth.uid());
drop policy if exists patient_record_share_access_recipient_read on public.patient_record_share_access_requests;
create policy patient_record_share_access_recipient_read on public.patient_record_share_access_requests for select to authenticated using (private.has_any_assignment_clinic_permission(recipient_clinic_id,'clinical_records','view'));
grant select on public.patient_record_share_access_requests to authenticated;
revoke insert,update,delete on public.patient_record_share_access_requests from anon,authenticated;
alter table public.patient_record_share_audit drop constraint if exists patient_record_share_audit_event_type_check;
alter table public.patient_record_share_audit add constraint patient_record_share_audit_event_type_check check (event_type = any(array['created','consent_confirmed','accessed','revoked','expired','exhausted','access_requested','access_approved','access_rejected']::text[]));
create or replace function public.request_patient_record_share_access(p_share_code text,p_recipient_clinic_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_share public.patient_record_shares%rowtype; v_patient_user uuid; v_request uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(coalesce(p_share_code,'')) < 20 or length(p_share_code)>200 then raise exception 'Invalid access code'; end if;
 if not private.has_any_assignment_clinic_permission(p_recipient_clinic_id,'clinical_records','view') then raise exception 'You do not have clinical-record access at the receiving hospital'; end if;
 select * into v_share from public.patient_record_shares s where s.share_code_hash=encode(extensions.digest(p_share_code,'sha256'),'hex') and s.status='active' and s.expires_at>now() and s.use_count<s.max_uses for update;
 if not found then raise exception 'Access code is invalid, expired, revoked or exhausted'; end if;
 if v_share.clinic_id=p_recipient_clinic_id then raise exception 'The receiving hospital must be different from the issuing hospital'; end if;
 select l.patient_user_id into v_patient_user from public.healthos_patient_record_identity_links l where l.clinic_id=v_share.clinic_id and l.patient_id=v_share.patient_id and l.status='active' limit 1;
 if v_patient_user is null then raise exception 'Patient has not linked this source-hospital record to their HealthOS identity'; end if;
 if not exists(select 1 from public.healthos_patient_hospital_links h where h.patient_user_id=v_patient_user and h.clinic_id=p_recipient_clinic_id and h.status='verified') then raise exception 'Patient must first verify their connection to the receiving hospital'; end if;
 insert into public.patient_record_share_access_requests(share_id,source_clinic_id,recipient_clinic_id,patient_user_id,requested_by,status)
 values(v_share.id,v_share.clinic_id,p_recipient_clinic_id,v_patient_user,auth.uid(),'awaiting_patient_approval')
 on conflict (share_id,recipient_clinic_id) where status='awaiting_patient_approval'
 do update set requested_by=excluded.requested_by,requested_at=now() returning id into v_request;
 insert into public.patient_record_share_audit(clinic_id,share_id,event_type,actor_id,details) values(v_share.clinic_id,v_share.id,'access_requested',auth.uid(),jsonb_build_object('request_id',v_request,'recipient_clinic_id',p_recipient_clinic_id));
 return v_request;
end $$;
create or replace function public.respond_patient_record_share_access(p_request_id uuid,p_approve boolean,p_patient_note text default null)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_req public.patient_record_share_access_requests%rowtype; v_share public.patient_record_shares%rowtype; v_event text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into v_req from public.patient_record_share_access_requests where id=p_request_id and patient_user_id=auth.uid() and status='awaiting_patient_approval' for update;
 if not found then raise exception 'Pending request not found for this patient'; end if;
 select * into v_share from public.patient_record_shares where id=v_req.share_id for update;
 if not found or v_share.status<>'active' or v_share.expires_at<=now() or v_share.use_count>=v_share.max_uses then
  update public.patient_record_share_access_requests set status='expired',responded_at=now() where id=p_request_id;
  raise exception 'The original access permission has expired or been revoked';
 end if;
 if p_approve then
  if not exists(select 1 from public.healthos_patient_hospital_links h where h.patient_user_id=auth.uid() and h.clinic_id=v_req.recipient_clinic_id and h.status='verified') then raise exception 'Verified connection to receiving hospital is required'; end if;
  update public.patient_record_share_access_requests set status='approved',responded_at=now(),patient_note=nullif(left(trim(coalesce(p_patient_note,'')),500),'') where id=p_request_id; v_event:='access_approved';
 else
  update public.patient_record_share_access_requests set status='rejected',responded_at=now(),patient_note=nullif(left(trim(coalesce(p_patient_note,'')),500),'') where id=p_request_id; v_event:='access_rejected';
 end if;
 insert into public.patient_record_share_audit(clinic_id,share_id,event_type,actor_id,details) values(v_req.source_clinic_id,v_req.share_id,v_event,auth.uid(),jsonb_build_object('request_id',p_request_id,'recipient_clinic_id',v_req.recipient_clinic_id));
 return true;
end $$;
revoke all on function public.request_patient_record_share_access(text,uuid) from public,anon;
revoke all on function public.respond_patient_record_share_access(uuid,boolean,text) from public,anon;
grant execute on function public.request_patient_record_share_access(text,uuid) to authenticated;
grant execute on function public.respond_patient_record_share_access(uuid,boolean,text) to authenticated;
