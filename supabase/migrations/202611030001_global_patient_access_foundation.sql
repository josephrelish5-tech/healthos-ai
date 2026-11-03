-- HealthOS AI: Global Patient Access Foundation
-- Apply this migration in the Supabase SQL Editor before enabling the patient portal.
-- Patient-to-hospital links are requests only; they do not grant access to clinical records.

create table if not exists public.healthos_patient_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    full_name text not null,
    phone_e164 text,
    country_code char(2),
    preferred_language text not null default 'en',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint healthos_patient_name_length check (char_length(trim(full_name)) between 2 and 150),
    constraint healthos_patient_country_code check (country_code is null or country_code ~ '^[A-Z]{2}$')
);

create table if not exists public.healthos_hospital_directory (
    id uuid primary key default gen_random_uuid(),
    clinic_id uuid not null unique references public.clinics(id) on delete cascade,
    public_name text not null,
    country_code char(2) not null,
    city text not null,
    address text,
    specialties text[] not null default '{}',
    accepting_patient_requests boolean not null default false,
    verification_status text not null default 'pending'
        check (verification_status in ('pending','verified','suspended')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint healthos_hospital_country_code check (country_code ~ '^[A-Z]{2}$'),
    constraint healthos_hospital_public_name_length check (char_length(trim(public_name)) between 2 and 180),
    constraint healthos_hospital_city_length check (char_length(trim(city)) between 2 and 120)
);

create index if not exists healthos_hospital_directory_search_idx
    on public.healthos_hospital_directory (country_code, city)
    where verification_status = 'verified' and accepting_patient_requests = true;

create table if not exists public.healthos_patient_hospital_links (
    id uuid primary key default gen_random_uuid(),
    patient_user_id uuid not null references auth.users(id) on delete cascade,
    clinic_id uuid not null references public.clinics(id) on delete cascade,
    status text not null default 'pending'
        check (status in ('pending','verified','rejected','revoked')),
    patient_message text,
    requested_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by uuid references auth.users(id) on delete set null,
    unique (patient_user_id, clinic_id)
);

create index if not exists healthos_patient_links_clinic_status_idx
    on public.healthos_patient_hospital_links (clinic_id, status, requested_at desc);
create index if not exists healthos_patient_links_user_idx
    on public.healthos_patient_hospital_links (patient_user_id, requested_at desc);

alter table public.healthos_patient_profiles enable row level security;
alter table public.healthos_hospital_directory enable row level security;
alter table public.healthos_patient_hospital_links enable row level security;

drop policy if exists "Patients read own HealthOS profile" on public.healthos_patient_profiles;
create policy "Patients read own HealthOS profile"
on public.healthos_patient_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Patients create own HealthOS profile" on public.healthos_patient_profiles;
create policy "Patients create own HealthOS profile"
on public.healthos_patient_profiles for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Patients update own HealthOS profile" on public.healthos_patient_profiles;
create policy "Patients update own HealthOS profile"
on public.healthos_patient_profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Public can discover verified hospitals accepting requests" on public.healthos_hospital_directory;
create policy "Public can discover verified hospitals accepting requests"
on public.healthos_hospital_directory for select to anon, authenticated
using (verification_status = 'verified' and accepting_patient_requests = true);

drop policy if exists "Clinic owners manage their hospital listing" on public.healthos_hospital_directory;
create policy "Clinic owners manage their hospital listing"
on public.healthos_hospital_directory for all to authenticated
using (
    exists (
        select 1 from public.clinics c
        where c.id = clinic_id and c.owner_user_id = auth.uid()
    )
    or exists (
        select 1 from public.clinic_memberships m
        where m.clinic_id = clinic_id and m.user_id = auth.uid()
          and m.status = 'active' and m.role in ('owner','admin')
    )
)
with check (
    exists (
        select 1 from public.clinics c
        where c.id = clinic_id and c.owner_user_id = auth.uid()
    )
    or exists (
        select 1 from public.clinic_memberships m
        where m.clinic_id = clinic_id and m.user_id = auth.uid()
          and m.status = 'active' and m.role in ('owner','admin')
    )
);

drop policy if exists "Patients read own hospital link requests" on public.healthos_patient_hospital_links;
create policy "Patients read own hospital link requests"
on public.healthos_patient_hospital_links for select to authenticated
using (patient_user_id = auth.uid());

drop policy if exists "Hospital managers read link requests" on public.healthos_patient_hospital_links;
create policy "Hospital managers read link requests"
on public.healthos_patient_hospital_links for select to authenticated
using (
    exists (
        select 1 from public.clinic_memberships m
        where m.clinic_id = clinic_id and m.user_id = auth.uid()
          and m.status = 'active' and m.role in ('owner','admin')
    )
    or exists (
        select 1 from public.clinics c
        where c.id = clinic_id and c.owner_user_id = auth.uid()
    )
);

drop policy if exists "Patients request a hospital connection" on public.healthos_patient_hospital_links;
create policy "Patients request a hospital connection"
on public.healthos_patient_hospital_links for insert to authenticated
with check (
    patient_user_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and exists (
        select 1 from public.healthos_hospital_directory d
        where d.clinic_id = clinic_id
          and d.verification_status = 'verified'
          and d.accepting_patient_requests = true
    )
);

drop policy if exists "Hospital managers review link requests" on public.healthos_patient_hospital_links;
create policy "Hospital managers review link requests"
on public.healthos_patient_hospital_links for update to authenticated
using (
    exists (
        select 1 from public.clinic_memberships m
        where m.clinic_id = clinic_id and m.user_id = auth.uid()
          and m.status = 'active' and m.role in ('owner','admin')
    )
    or exists (
        select 1 from public.clinics c
        where c.id = clinic_id and c.owner_user_id = auth.uid()
    )
)
with check (
    status in ('verified','rejected','revoked')
    and reviewed_at is not null
    and reviewed_by = auth.uid()
    and (
        exists (
            select 1 from public.clinic_memberships m
            where m.clinic_id = clinic_id and m.user_id = auth.uid()
              and m.status = 'active' and m.role in ('owner','admin')
        )
        or exists (
            select 1 from public.clinics c
            where c.id = clinic_id and c.owner_user_id = auth.uid()
        )
    )
);

comment on table public.healthos_patient_profiles is
    'Global patient-facing identity profile; separate from facility-owned clinical records.';
comment on table public.healthos_hospital_directory is
    'Opt-in public directory. Only verified facilities accepting requests are discoverable.';
comment on table public.healthos_patient_hospital_links is
    'Patient-authorised connection requests. A verified link is not, by itself, permission to read clinical records.';
