-- Stage 5D Part 2R: actual uploaded-file integrity and independent verification.
-- Additive to Parts 2P/2Q. This migration does not change clinical, billing, pharmacy,
-- task-state, supervisor-review, or existing text/reference evidence workflows.
-- File bytes are hashed by the trusted Edge Function, never by the browser.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hospital-investigation-evidence',
  'hospital-investigation-evidence',
  false,
  15728640,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

create table if not exists public.staff_task_evidence_file_integrity (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  task_id uuid not null,
  evidence_id uuid not null unique references public.staff_task_evidence(id) on delete restrict,
  storage_bucket text not null check (storage_bucket = 'hospital-investigation-evidence'),
  storage_object_key text not null unique,
  original_sha256 text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size between 1 and 15728640),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  original_file_name text not null check (length(original_file_name) between 1 and 180),
  uploaded_by_user_id uuid not null references auth.users(id) on delete restrict,
  uploaded_by_staff_profile_id uuid not null references public.staff_profiles(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  constraint staff_task_evidence_file_integrity_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict,
  constraint staff_task_evidence_file_integrity_evidence_scope_uq
    unique (clinic_id, task_id, evidence_id)
);

create index if not exists staff_task_evidence_file_integrity_scope_idx
  on public.staff_task_evidence_file_integrity(clinic_id, task_id, uploaded_at desc);

create table if not exists public.staff_task_evidence_file_verifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  evidence_id uuid not null references public.staff_task_evidence(id) on delete restrict,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  requested_by_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  verification_result text not null check (verification_result in ('verified','hash_mismatch','file_missing','verification_error')),
  original_sha256 text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  observed_sha256 text check (observed_sha256 is null or observed_sha256 ~ '^[0-9a-f]{64}$'),
  original_byte_size bigint not null,
  observed_byte_size bigint,
  verified_at timestamptz not null default now(),
  error_code text,
  constraint staff_task_evidence_file_verifications_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict
);

create index if not exists staff_task_evidence_file_verifications_scope_idx
  on public.staff_task_evidence_file_verifications(clinic_id, task_id, verified_at desc);

create table if not exists public.staff_task_evidence_file_access_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  evidence_id uuid not null references public.staff_task_evidence(id) on delete restrict,
  accessed_by_user_id uuid not null references auth.users(id) on delete restrict,
  accessed_by_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  action text not null check (action in ('verification_requested','file_retrieved')),
  outcome text not null check (outcome in ('verified','denied','hash_mismatch','file_missing','error')),
  verification_id uuid references public.staff_task_evidence_file_verifications(id) on delete restrict,
  accessed_at timestamptz not null default now(),
  constraint staff_task_evidence_file_access_log_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict
);

create index if not exists staff_task_evidence_file_access_log_scope_idx
  on public.staff_task_evidence_file_access_log(clinic_id, task_id, accessed_at desc);

create table if not exists public.staff_task_evidence_file_tamper_alerts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  evidence_id uuid not null references public.staff_task_evidence(id) on delete restrict,
  verification_id uuid not null references public.staff_task_evidence_file_verifications(id) on delete restrict,
  alert_type text not null check (alert_type in ('uploaded_file_hash_mismatch','uploaded_file_missing')),
  severity text not null default 'critical' check (severity in ('high','critical')),
  alert_status text not null default 'open' check (alert_status in ('open','acknowledged','resolved')),
  created_at timestamptz not null default now(),
  constraint staff_task_evidence_file_tamper_alerts_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict
);

create index if not exists staff_task_evidence_file_tamper_alerts_scope_idx
  on public.staff_task_evidence_file_tamper_alerts(clinic_id, task_id, created_at desc);

alter table public.staff_task_evidence_file_integrity enable row level security;
alter table public.staff_task_evidence_file_verifications enable row level security;
alter table public.staff_task_evidence_file_access_log enable row level security;
alter table public.staff_task_evidence_file_tamper_alerts enable row level security;

revoke all on public.staff_task_evidence_file_integrity from public, anon, authenticated;
revoke all on public.staff_task_evidence_file_verifications from public, anon, authenticated;
revoke all on public.staff_task_evidence_file_access_log from public, anon, authenticated;
revoke all on public.staff_task_evidence_file_tamper_alerts from public, anon, authenticated;

grant all on public.staff_task_evidence_file_integrity to service_role;
grant all on public.staff_task_evidence_file_verifications to service_role;
grant all on public.staff_task_evidence_file_access_log to service_role;
grant all on public.staff_task_evidence_file_tamper_alerts to service_role;

create or replace function public.prevent_staff_task_evidence_file_integrity_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Uploaded evidence integrity history is append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_evidence_file_integrity_immutable
  on public.staff_task_evidence_file_integrity;
create trigger staff_task_evidence_file_integrity_immutable
before update or delete on public.staff_task_evidence_file_integrity
for each row execute function public.prevent_staff_task_evidence_file_integrity_mutation();

drop trigger if exists staff_task_evidence_file_verifications_append_only
  on public.staff_task_evidence_file_verifications;
create trigger staff_task_evidence_file_verifications_append_only
before update or delete on public.staff_task_evidence_file_verifications
for each row execute function public.prevent_staff_task_evidence_file_integrity_mutation();

drop trigger if exists staff_task_evidence_file_access_log_append_only
  on public.staff_task_evidence_file_access_log;
create trigger staff_task_evidence_file_access_log_append_only
before update or delete on public.staff_task_evidence_file_access_log
for each row execute function public.prevent_staff_task_evidence_file_integrity_mutation();

-- Only the trusted Edge Function (service_role) may register a completed upload.
-- The database re-checks assignment ownership before creating the evidence and hash baseline.
create or replace function public.register_staff_task_evidence_file(
  p_clinic_id uuid,
  p_task_id uuid,
  p_staff_profile_id uuid,
  p_uploaded_by_user_id uuid,
  p_storage_object_key text,
  p_original_sha256 text,
  p_byte_size bigint,
  p_mime_type text,
  p_original_file_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_evidence_id uuid;
  v_assignment_id uuid;
  v_status text;
begin
  if p_clinic_id is null or p_task_id is null or p_staff_profile_id is null
     or p_uploaded_by_user_id is null then
    raise exception 'Clinic, task, uploader and staff profile are required'
      using errcode = '22023';
  end if;
  if p_storage_object_key is null
     or p_storage_object_key !~ ('^' || p_clinic_id::text || '/' || p_task_id::text || '/[0-9a-f-]{36}$') then
    raise exception 'Invalid immutable evidence object key' using errcode = '22023';
  end if;
  if p_original_sha256 is null or p_original_sha256 !~ '^[0-9a-f]{64}$'
     or p_byte_size is null or p_byte_size < 1 or p_byte_size > 15728640 then
    raise exception 'Invalid original file fingerprint or size' using errcode = '22023';
  end if;
  if p_mime_type not in ('application/pdf','image/jpeg','image/png','image/webp') then
    raise exception 'Unsupported evidence file type' using errcode = '22023';
  end if;
  if length(coalesce(p_original_file_name,'')) < 1 or length(p_original_file_name) > 180 then
    raise exception 'Invalid original file name' using errcode = '22023';
  end if;

  select t.task_status, t.assigned_to_assignment_id
    into v_status, v_assignment_id
  from public.staff_tasks t
  where t.id = p_task_id and t.clinic_id = p_clinic_id;

  if not found or v_status in ('submitted','completed','cancelled') then
    raise exception 'Task is unavailable for new evidence' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.staff_department_assignments a
    join public.staff_profiles sp
      on sp.id = a.staff_profile_id and sp.clinic_id = a.clinic_id
    where a.id = v_assignment_id
      and a.clinic_id = p_clinic_id
      and a.staff_profile_id = p_staff_profile_id
      and a.assignment_status = 'active'
      and a.effective_from <= current_date
      and (a.effective_to is null or a.effective_to >= current_date)
      and sp.user_id = p_uploaded_by_user_id
      and sp.employment_status = 'active'
  ) then
    raise exception 'Uploader is not the active assignee for this task'
      using errcode = '42501';
  end if;

  insert into public.staff_task_evidence (
    clinic_id, task_id, submitted_by_staff_profile_id,
    evidence_type, storage_path, captured_at
  ) values (
    p_clinic_id, p_task_id, p_staff_profile_id,
    case when p_mime_type like 'image/%' then 'photo' else 'file' end,
    p_storage_object_key, now()
  )
  returning id into v_evidence_id;

  insert into public.staff_task_evidence_file_integrity (
    clinic_id, task_id, evidence_id, storage_bucket, storage_object_key,
    original_sha256, byte_size, mime_type, original_file_name,
    uploaded_by_user_id, uploaded_by_staff_profile_id
  ) values (
    p_clinic_id, p_task_id, v_evidence_id, 'hospital-investigation-evidence',
    p_storage_object_key, p_original_sha256, p_byte_size, p_mime_type,
    p_original_file_name, p_uploaded_by_user_id, p_staff_profile_id
  );

  insert into public.staff_task_events (clinic_id, task_id, event_type, actor_staff_profile_id, event_note)
  values (p_clinic_id, p_task_id, 'evidence_added', p_staff_profile_id, 'Uploaded file evidence registered with SHA-256 integrity baseline');

  return v_evidence_id;
end;
$function$;

revoke all on function public.register_staff_task_evidence_file(uuid,uuid,uuid,uuid,text,text,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.register_staff_task_evidence_file(uuid,uuid,uuid,uuid,text,text,bigint,text,text)
  to service_role;

-- Read-only audit: file names and verification status only; never returns storage keys or full hashes.
create or replace function public.get_hospital_investigation_file_integrity_audit(
  p_clinic_id uuid,
  p_task_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_profile_id uuid;
  v_task public.staff_tasks%rowtype;
  v_files jsonb := '[]'::jsonb;
  v_file_count integer := 0;
  v_verified integer := 0;
  v_mismatch integer := 0;
  v_missing integer := 0;
  v_open_alerts integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_task_id is null then
    raise exception 'Clinic and task are required' using errcode = '22023';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active'
  limit 1;
  if v_role is null then
    raise exception 'Active hospital membership required' using errcode = '42501';
  end if;

  select sp.id into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid
    and sp.employment_status = 'active'
  limit 1;

  select t.* into v_task
  from public.staff_tasks t
  where t.id = p_task_id and t.clinic_id = p_clinic_id;
  if not found then
    raise exception 'Task not found in this hospital' using errcode = 'P0002';
  end if;

  if v_role not in ('owner','admin') then
    if not (
      (v_profile_id is not null and exists (
        select 1 from public.staff_department_assignments a
        where a.id = v_task.assigned_to_assignment_id
          and a.clinic_id = p_clinic_id
          and a.staff_profile_id = v_profile_id
          and a.assignment_status = 'active'
          and a.effective_from <= current_date
          and (a.effective_to is null or a.effective_to >= current_date)
      ))
      or
      (v_profile_id is not null and exists (
        select 1
        from public.staff_department_assignments manager_assignment
        join public.clinic_management_assignments ma
          on ma.clinic_id = manager_assignment.clinic_id
         and ma.manager_assignment_id = manager_assignment.id
        where manager_assignment.clinic_id = p_clinic_id
          and manager_assignment.staff_profile_id = v_profile_id
          and manager_assignment.assignment_status = 'active'
          and manager_assignment.effective_from <= current_date
          and (manager_assignment.effective_to is null or manager_assignment.effective_to >= current_date)
          and ma.department_id = v_task.department_id
          and (ma.unit_id is null or ma.unit_id = v_task.unit_id)
          and ma.assignment_status in ('active','delegated')
          and ma.effective_from <= current_date
          and (ma.effective_to is null or ma.effective_to >= current_date)
      ))
    ) then
      raise exception 'Assigned staff or appointed department/unit manager access required'
        using errcode = '42501';
    end if;
  end if;

  select count(*)::integer,
    count(*) filter (where latest.verification_result = 'verified')::integer,
    count(*) filter (where latest.verification_result = 'hash_mismatch')::integer,
    count(*) filter (where latest.verification_result = 'file_missing')::integer
  into v_file_count, v_verified, v_mismatch, v_missing
  from public.staff_task_evidence_file_integrity f
  left join lateral (
    select h.verification_result
    from public.staff_task_evidence_file_verifications h
    where h.evidence_id = f.evidence_id and h.clinic_id = f.clinic_id
    order by h.verified_at desc, h.id desc
    limit 1
  ) latest on true
  where f.clinic_id = p_clinic_id and f.task_id = p_task_id;

  select count(*)::integer into v_open_alerts
  from public.staff_task_evidence_file_tamper_alerts a
  where a.clinic_id = p_clinic_id and a.task_id = p_task_id
    and a.alert_status = 'open';

  select coalesce(jsonb_agg(jsonb_build_object(
    'evidence_id', f.evidence_id,
    'file_name', f.original_file_name,
    'mime_type', f.mime_type,
    'byte_size', f.byte_size,
    'uploaded_at', f.uploaded_at,
    'uploaded_by_staff_profile_id', f.uploaded_by_staff_profile_id,
    'latest_verification', coalesce(latest.verification_result, 'not_yet_verified'),
    'last_verified_at', latest.verified_at,
    'open_tamper_alerts', coalesce(alerts.alert_count, 0)
  ) order by f.uploaded_at desc), '[]'::jsonb)
  into v_files
  from public.staff_task_evidence_file_integrity f
  left join lateral (
    select h.verification_result, h.verified_at
    from public.staff_task_evidence_file_verifications h
    where h.evidence_id = f.evidence_id and h.clinic_id = f.clinic_id
    order by h.verified_at desc, h.id desc
    limit 1
  ) latest on true
  left join lateral (
    select count(*)::integer alert_count
    from public.staff_task_evidence_file_tamper_alerts a
    where a.evidence_id = f.evidence_id and a.alert_status = 'open'
  ) alerts on true
  where f.clinic_id = p_clinic_id and f.task_id = p_task_id;

  return jsonb_build_object(
    'read_only', true,
    'clinic_id', p_clinic_id,
    'task_id', p_task_id,
    'generated_at', now(),
    'summary', jsonb_build_object(
      'files_registered', v_file_count,
      'files_verified', v_verified,
      'files_modified_or_replaced', v_mismatch,
      'files_missing', v_missing,
      'open_tamper_alerts', v_open_alerts
    ),
    'files', v_files,
    'limitations', jsonb_build_array(
      'Verification compares actual downloaded object bytes against the trusted upload-time SHA-256 baseline.',
      'A matching hash proves byte consistency with the stored baseline, not that the original document is truthful or clinically authentic.',
      'A privileged storage or database administrator may still bypass application controls; independent backups and operational controls remain important.'
    )
  );
end;
$function$;

revoke all on function public.get_hospital_investigation_file_integrity_audit(uuid,uuid)
  from public, anon;
grant execute on function public.get_hospital_investigation_file_integrity_audit(uuid,uuid)
  to authenticated;

comment on table public.staff_task_evidence_file_integrity is
'Immutable upload-time SHA-256 baseline for actual hospital investigation evidence file bytes. Storage keys are private and are not returned by audit RPCs.';
comment on table public.staff_task_evidence_file_verifications is
'Append-only history of independent verification results calculated from actual downloaded evidence file bytes.';
comment on table public.staff_task_evidence_file_access_log is
'Append-only access history for verification requests and successful or blocked file retrieval.';
comment on table public.staff_task_evidence_file_tamper_alerts is
'Tamper alerts raised when actual uploaded evidence bytes are missing or do not match their upload-time SHA-256 baseline.';
