create table if not exists public.healthos_patient_appointment_requests (
 id uuid primary key default gen_random_uuid(),
 patient_user_id uuid not null references auth.users(id) on delete cascade,
 clinic_id uuid not null references public.clinics(id) on delete cascade,
 requested_at timestamptz not null,
 reason text not null check (char_length(trim(reason)) between 3 and 500),
 visit_type text not null default 'in_person' check (visit_type in ('in_person','audio','video')),
 status text not null default 'requested' check (status in ('requested','accepted','rejected','cancelled')),
 patient_note text check (patient_note is null or char_length(patient_note) <= 1000),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 hospital_note text check (hospital_note is null or char_length(hospital_note) <= 1000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists healthos_patient_appointment_clinic_date_idx on public.healthos_patient_appointment_requests(clinic_id, requested_at);
create index if not exists healthos_patient_appointment_patient_idx on public.healthos_patient_appointment_requests(patient_user_id, created_at desc);
alter table public.healthos_patient_appointment_requests enable row level security;
drop policy if exists "Patients create appointment requests for connected hospitals" on public.healthos_patient_appointment_requests;
create policy "Patients create appointment requests for connected hospitals" on public.healthos_patient_appointment_requests for insert to authenticated with check (patient_user_id=auth.uid() and requested_at>now() and exists(select 1 from public.healthos_patient_hospital_links l where l.patient_user_id=auth.uid() and l.clinic_id=healthos_patient_appointment_requests.clinic_id and l.status='verified'));
drop policy if exists "Patients read own appointment requests" on public.healthos_patient_appointment_requests;
create policy "Patients read own appointment requests" on public.healthos_patient_appointment_requests for select to authenticated using (patient_user_id=auth.uid());
drop policy if exists "Hospital managers read appointment requests" on public.healthos_patient_appointment_requests;
create policy "Hospital managers read appointment requests" on public.healthos_patient_appointment_requests for select to authenticated using (exists(select 1 from public.clinics c where c.id=healthos_patient_appointment_requests.clinic_id and c.owner_user_id=auth.uid()) or exists(select 1 from public.clinic_memberships m where m.clinic_id=healthos_patient_appointment_requests.clinic_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin')));
drop policy if exists "Hospital managers review appointment requests" on public.healthos_patient_appointment_requests;
create policy "Hospital managers review appointment requests" on public.healthos_patient_appointment_requests for update to authenticated using (exists(select 1 from public.clinics c where c.id=healthos_patient_appointment_requests.clinic_id and c.owner_user_id=auth.uid()) or exists(select 1 from public.clinic_memberships m where m.clinic_id=healthos_patient_appointment_requests.clinic_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','admin'))) with check(status in ('accepted','rejected') and reviewed_by=auth.uid() and reviewed_at is not null);
