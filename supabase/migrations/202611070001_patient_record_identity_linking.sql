-- HealthOS AI: patient-controlled identity linking to a hospital's local patient record.
-- A patient requests a link using their hospital-issued patient number.
-- A hospital owner/admin must match that number to a record in their own clinic.
-- No clinical record access is granted by this identity link alone.

create table if not exists public.healthos_patient_record_identity_requests (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_number text not null,
  patient_message text check (patient_message is null or char_length(patient_message) <= 500),
  consent_confirmed boolean not null default false,
  consent_at timestamptz,
  status text not null default 'requested'
    check (status in ('requested','matched','rejected','revoked')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint healthos_patient_identity_number_length check (char_length(trim(patient_number)) between 2 and 60),
  constraint healthos_patient_identity_consent_check check (
    (consent_confirmed = false and consent_at is null)
    or (consent_confirmed = true and consent_at is not null)
  )
);

create unique index if not exists healthos_patient_identity_one_open_request
  on public.healthos_patient_record_identity_requests(patient_user_id, clinic_id)
  where status = 'requested';

create table if not exists public.healthos_patient_record_identity_links (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  linked_by uuid not null references auth.users(id),
  linked_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','revoked')),
  revoked_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint healthos_patient_identity_link_patient_unique unique (clinic_id, patient_id),
  constraint healthos_patient_identity_link_user_unique unique (patient_user_id, clinic_id)
);

create table if not exists public.healthos_patient_identity_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.healthos_patient_record_identity_requests(id) on delete set null,
  link_id uuid references public.healthos_patient_record_identity_links(id) on delete set null,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists healthos_patient_identity_requests_clinic_idx
 on public.healthos_patient_record_identity_requests(clinic_id,status,requested_at desc);
create index if not exists healthos_patient_identity_requests_patient_idx
 on public.healthos_patient_record_identity_requests(patient_user_id,requested_at desc);

alter table public.healthos_patient_record_identity_requests enable row level security;
alter table public.healthos_patient_record_identity_links enable row level security;
alter table public.healthos_patient_identity_audit enable row level security;

drop policy if exists "Patients read own identity link requests" on public.healthos_patient_record_identity_requests;
create policy "Patients read own identity link requests"
 on public.healthos_patient_record_identity_requests for select to authenticated
 using (patient_user_id = (select auth.uid()));

drop policy if exists "Patients request own identity link" on public.healthos_patient_record_identity_requests;
create policy "Patients request own identity link"
 on public.healthos_patient_record_identity_requests for insert to authenticated
 with check (
   patient_user_id = (select auth.uid())
   and status = 'requested'
   and consent_confirmed = true
   and consent_at is not null
   and reviewed_at is null
   and reviewed_by is null
   and not exists (
     select 1 from public.healthos_patient_record_identity_links x
     where x.patient_user_id=(select auth.uid())
       and x.clinic_id=healthos_patient_record_identity_requests.clinic_id
       and x.status='active'
   )
   and exists (
     select 1 from public.healthos_patient_hospital_links l
     where l.patient_user_id = (select auth.uid())
       and l.clinic_id = healthos_patient_record_identity_requests.clinic_id
       and l.status = 'verified'
   )
 );

drop policy if exists "Hospital managers read identity link requests" on public.healthos_patient_record_identity_requests;
create policy "Hospital managers read identity link requests"
 on public.healthos_patient_record_identity_requests for select to authenticated
 using (
   exists(select 1 from public.clinics c where c.id=clinic_id and c.owner_user_id=(select auth.uid()))
   or exists(select 1 from public.clinic_memberships m where m.clinic_id=clinic_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','admin'))
 );

drop policy if exists "Hospital managers read identity links" on public.healthos_patient_record_identity_links;
create policy "Hospital managers read identity links"
 on public.healthos_patient_record_identity_links for select to authenticated
 using (
   exists(select 1 from public.clinics c where c.id=clinic_id and c.owner_user_id=(select auth.uid()))
   or exists(select 1 from public.clinic_memberships m where m.clinic_id=clinic_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','admin'))
 );

drop policy if exists "Hospital managers read patient identity audit" on public.healthos_patient_identity_audit;
create policy "Hospital managers read patient identity audit"
 on public.healthos_patient_identity_audit for select to authenticated
 using (
   exists(select 1 from public.clinics c where c.id=clinic_id and c.owner_user_id=(select auth.uid()))
   or exists(select 1 from public.clinic_memberships m where m.clinic_id=clinic_id and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','admin'))
 );

grant select, insert on public.healthos_patient_record_identity_requests to authenticated;
grant select on public.healthos_patient_record_identity_links to authenticated;
grant select on public.healthos_patient_identity_audit to authenticated;

create or replace function public.healthos_review_patient_identity_link_request(
 p_request_id uuid,
 p_decision text,
 p_patient_id uuid default null,
 p_review_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_uid uuid := auth.uid();
 v_request public.healthos_patient_record_identity_requests%rowtype;
 v_link public.healthos_patient_record_identity_links%rowtype;
 v_link_id uuid;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select * into v_request
 from public.healthos_patient_record_identity_requests
 where id=p_request_id
 for update;
 if not found then raise exception 'Identity link request not found'; end if;
 if not (
   exists(select 1 from public.clinics c where c.id=v_request.clinic_id and c.owner_user_id=v_uid)
   or exists(select 1 from public.clinic_memberships m where m.clinic_id=v_request.clinic_id and m.user_id=v_uid and m.status='active' and m.role in ('owner','admin'))
 ) then raise exception 'Hospital owner or administrator permission required'; end if;
 if v_request.status <> 'requested' then raise exception 'This identity request has already been reviewed'; end if;
 if p_decision not in ('matched','rejected') then raise exception 'Decision must be matched or rejected'; end if;
 if length(trim(coalesce(p_review_note,''))) < 5 then raise exception 'A review note of at least five characters is required'; end if;

 if p_decision='matched' then
   if p_patient_id is null then raise exception 'Select the matching hospital patient record'; end if;
   if not exists(
     select 1 from public.patients p
     where p.id=p_patient_id and p.clinic_id=v_request.clinic_id
       and lower(trim(p.patient_number))=lower(trim(v_request.patient_number))
   ) then raise exception 'The selected patient record does not match this hospital and patient number'; end if;

   select * into v_link
   from public.healthos_patient_record_identity_links
   where patient_user_id=v_request.patient_user_id and clinic_id=v_request.clinic_id
   for update;
   if found and v_link.status='active' and v_link.patient_id<>p_patient_id then
     raise exception 'An active identity link already exists. Revoke it before changing the linked hospital record.';
   end if;

   insert into public.healthos_patient_record_identity_links(patient_user_id,clinic_id,patient_id,linked_by)
   values(v_request.patient_user_id,v_request.clinic_id,p_patient_id,v_uid)
   on conflict (patient_user_id,clinic_id) do update
     set patient_id=excluded.patient_id, linked_by=excluded.linked_by,
         linked_at=now(), status='active', revoked_by=null, revoked_at=null
   returning id into v_link_id;
 end if;

 update public.healthos_patient_record_identity_requests
 set status=p_decision,reviewed_at=now(),reviewed_by=v_uid,
     review_note=trim(p_review_note),updated_at=now()
 where id=p_request_id;

 insert into public.healthos_patient_identity_audit(
   request_id,link_id,patient_user_id,clinic_id,actor_user_id,event_type,details
 ) values (
   p_request_id,v_link_id,v_request.patient_user_id,v_request.clinic_id,v_uid,
   case when p_decision='matched' then 'identity_link_matched' else 'identity_link_rejected' end,
   jsonb_build_object('decision',p_decision,'review_note',trim(p_review_note),'patient_record_link_created',v_link_id is not null)
 );

 return jsonb_build_object('success',true,'request_id',p_request_id,'status',p_decision,'link_id',v_link_id);
end;
$$;

create or replace function public.healthos_patient_revoke_identity_link(p_clinic_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_link public.healthos_patient_record_identity_links%rowtype;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 select * into v_link from public.healthos_patient_record_identity_links
 where patient_user_id=v_uid and clinic_id=p_clinic_id and status='active' for update;
 if not found then raise exception 'No active patient identity link exists for this hospital'; end if;
 update public.healthos_patient_record_identity_links
 set status='revoked',revoked_by=v_uid,revoked_at=now()
 where id=v_link.id;
 update public.healthos_patient_record_identity_requests
 set status='revoked',updated_at=now()
 where patient_user_id=v_uid and clinic_id=p_clinic_id and status='matched';
 insert into public.healthos_patient_identity_audit(link_id,patient_user_id,clinic_id,actor_user_id,event_type)
 values(v_link.id,v_uid,p_clinic_id,v_uid,'patient_revoked_identity_link');
 return true;
end;
$$;

revoke all on function public.healthos_review_patient_identity_link_request(uuid,text,uuid,text) from public;
revoke all on function public.healthos_patient_revoke_identity_link(uuid) from public;
grant execute on function public.healthos_review_patient_identity_link_request(uuid,text,uuid,text) to authenticated;
grant execute on function public.healthos_patient_revoke_identity_link(uuid) to authenticated;
