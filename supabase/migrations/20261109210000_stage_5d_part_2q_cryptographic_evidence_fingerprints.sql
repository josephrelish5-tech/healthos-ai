-- Stage 5D Part 2Q: cryptographic evidence-record fingerprints and tamper detection.
-- Uses the already-installed pgcrypto extension in the extensions schema.
-- Hashes a canonical snapshot of database evidence metadata, including storage object key.
-- IMPORTANT: this does NOT download or hash bytes stored in Supabase Storage / external object storage.
-- It detects database-row alteration/deletion and mismatches against the immutable fingerprint ledger.

create table if not exists public.staff_task_evidence_integrity_ledger (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  evidence_id uuid not null,
  evidence_version integer not null default 1 check (evidence_version > 0),
  event_type text not null check (event_type in ('baseline_backfill','evidence_captured')),
  hash_algorithm text not null default 'SHA-256' check (hash_algorithm = 'SHA-256'),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  captured_by_staff_profile_id uuid,
  fingerprinted_at timestamptz not null default now(),
  constraint staff_task_evidence_integrity_ledger_evidence_version_uq
    unique (evidence_id, evidence_version)
);

create index if not exists staff_task_evidence_integrity_ledger_scope_idx
  on public.staff_task_evidence_integrity_ledger(clinic_id, task_id, fingerprinted_at desc);

alter table public.staff_task_evidence_integrity_ledger enable row level security;
revoke all on table public.staff_task_evidence_integrity_ledger from public, anon, authenticated;

create or replace function public.staff_task_evidence_fingerprint(
  p_id uuid,
  p_clinic_id uuid,
  p_task_id uuid,
  p_submitted_by_staff_profile_id uuid,
  p_evidence_type text,
  p_storage_path text,
  p_evidence_text text,
  p_source_reference text,
  p_captured_at timestamptz,
  p_created_at timestamptz
)
returns text
language sql
immutable
strict
set search_path = ''
as $function$
  select encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'id', p_id,
          'clinic_id', p_clinic_id,
          'task_id', p_task_id,
          'submitted_by_staff_profile_id', p_submitted_by_staff_profile_id,
          'evidence_type', p_evidence_type,
          'storage_path', p_storage_path,
          'evidence_text', p_evidence_text,
          'source_reference', p_source_reference,
          'captured_at', p_captured_at,
          'created_at', p_created_at
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$function$;

-- Backfill an initial fingerprint for every evidence row already present.
insert into public.staff_task_evidence_integrity_ledger(
  clinic_id, task_id, evidence_id, evidence_version, event_type,
  hash_algorithm, evidence_sha256, captured_by_staff_profile_id
)
select
  e.clinic_id, e.task_id, e.id, 1, 'baseline_backfill', 'SHA-256',
  public.staff_task_evidence_fingerprint(
    e.id, e.clinic_id, e.task_id, e.submitted_by_staff_profile_id,
    e.evidence_type, e.storage_path, e.evidence_text, e.source_reference,
    e.captured_at, e.created_at
  ),
  e.submitted_by_staff_profile_id
from public.staff_task_evidence e
on conflict (evidence_id, evidence_version) do nothing;

create or replace function public.capture_staff_task_evidence_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.staff_task_evidence_integrity_ledger(
    clinic_id, task_id, evidence_id, evidence_version, event_type,
    hash_algorithm, evidence_sha256, captured_by_staff_profile_id
  )
  values (
    new.clinic_id, new.task_id, new.id, 1, 'evidence_captured', 'SHA-256',
    public.staff_task_evidence_fingerprint(
      new.id, new.clinic_id, new.task_id, new.submitted_by_staff_profile_id,
      new.evidence_type, new.storage_path, new.evidence_text, new.source_reference,
      new.captured_at, new.created_at
    ),
    new.submitted_by_staff_profile_id
  )
  on conflict (evidence_id, evidence_version) do nothing;
  return new;
end;
$function$;

drop trigger if exists staff_task_evidence_capture_fingerprint on public.staff_task_evidence;
create trigger staff_task_evidence_capture_fingerprint
after insert on public.staff_task_evidence
for each row execute function public.capture_staff_task_evidence_fingerprint();

create or replace function public.prevent_staff_task_evidence_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Investigation evidence is immutable. Submit a new evidence record or a separately authorised correction record.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_evidence_immutable on public.staff_task_evidence;
create trigger staff_task_evidence_immutable
before update or delete on public.staff_task_evidence
for each row execute function public.prevent_staff_task_evidence_mutation();

create or replace function public.prevent_staff_task_evidence_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Evidence integrity ledger is append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_evidence_integrity_ledger_append_only on public.staff_task_evidence_integrity_ledger;
create trigger staff_task_evidence_integrity_ledger_append_only
before update or delete on public.staff_task_evidence_integrity_ledger
for each row execute function public.prevent_staff_task_evidence_ledger_mutation();

create or replace function public.get_hospital_investigation_evidence_fingerprint_audit(
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
  v_evidence jsonb := '[]'::jsonb;
  v_missing integer := 0;
  v_mismatch integer := 0;
  v_orphaned integer := 0;
  v_count integer := 0;
  v_findings text[] := array[]::text[];
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
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid and sp.employment_status = 'active'
  limit 1;

  select t.* into v_task
  from public.staff_tasks t
  where t.id = p_task_id and t.clinic_id = p_clinic_id;
  if not found then
    raise exception 'Task not found in this hospital' using errcode = 'P0002';
  end if;

  if v_role not in ('owner','admin') then
    if v_profile_id is null or not exists (
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
    ) then
      raise exception 'Hospital administrator or currently appointed department/unit manager access required'
        using errcode = '42501';
    end if;
  end if;

  select count(*)::integer into v_count
  from public.staff_task_evidence e
  where e.clinic_id = p_clinic_id and e.task_id = p_task_id;

  select
    count(*) filter (where l.evidence_id is null)::integer,
    count(*) filter (
      where l.evidence_id is not null
        and l.evidence_sha256 is distinct from public.staff_task_evidence_fingerprint(
          e.id, e.clinic_id, e.task_id, e.submitted_by_staff_profile_id,
          e.evidence_type, e.storage_path, e.evidence_text, e.source_reference,
          e.captured_at, e.created_at
        )
    )::integer
  into v_missing, v_mismatch
  from public.staff_task_evidence e
  left join public.staff_task_evidence_integrity_ledger l
    on l.evidence_id = e.id and l.evidence_version = 1
   and l.clinic_id = e.clinic_id and l.task_id = e.task_id
  where e.clinic_id = p_clinic_id and e.task_id = p_task_id;

  select count(*)::integer into v_orphaned
  from public.staff_task_evidence_integrity_ledger l
  left join public.staff_task_evidence e
    on e.id = l.evidence_id and e.clinic_id = l.clinic_id and e.task_id = l.task_id
  where l.clinic_id = p_clinic_id and l.task_id = p_task_id
    and e.id is null;

  if v_missing > 0 then v_findings := array_append(v_findings, 'evidence_fingerprint_missing'); end if;
  if v_mismatch > 0 then v_findings := array_append(v_findings, 'evidence_record_fingerprint_mismatch'); end if;
  if v_orphaned > 0 then v_findings := array_append(v_findings, 'fingerprint_ledger_entry_without_evidence_record'); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'evidence_id', e.id,
    'evidence_type', e.evidence_type,
    'created_at', e.created_at,
    'fingerprinted_at', l.fingerprinted_at,
    'hash_algorithm', l.hash_algorithm,
    'fingerprint_status', case
      when l.evidence_id is null then 'missing'
      when l.evidence_sha256 = public.staff_task_evidence_fingerprint(
        e.id, e.clinic_id, e.task_id, e.submitted_by_staff_profile_id,
        e.evidence_type, e.storage_path, e.evidence_text, e.source_reference,
        e.captured_at, e.created_at
      ) then 'verified'
      else 'mismatch'
    end,
    'fingerprint_prefix', case when l.evidence_sha256 is null then null else left(l.evidence_sha256, 16) end
  ) order by e.created_at, e.id), '[]'::jsonb)
  into v_evidence
  from public.staff_task_evidence e
  left join public.staff_task_evidence_integrity_ledger l
    on l.evidence_id = e.id and l.evidence_version = 1
   and l.clinic_id = e.clinic_id and l.task_id = e.task_id
  where e.clinic_id = p_clinic_id and e.task_id = p_task_id;

  return jsonb_build_object(
    'read_only', true,
    'audit_type', 'hospital_investigation_evidence_fingerprint',
    'clinic_id', p_clinic_id,
    'task_id', p_task_id,
    'generated_at', now(),
    'scope', case when v_role in ('owner','admin') then 'hospital_administrator' else 'appointed_department_or_unit_manager' end,
    'summary', jsonb_build_object(
      'evidence_records_reviewed', v_count,
      'fingerprints_verified', greatest(v_count - v_missing - v_mismatch, 0),
      'fingerprints_missing', v_missing,
      'fingerprints_mismatched', v_mismatch,
      'orphaned_ledger_entries', v_orphaned,
      'finding_count', cardinality(v_findings)
    ),
    'findings', to_jsonb(v_findings),
    'evidence_register', v_evidence,
    'limitations', jsonb_build_array(
      'SHA-256 fingerprints cover the canonical database evidence record, including its storage object key.',
      'The bytes inside the referenced uploaded file are not downloaded or hashed by this database audit.',
      'This is tamper-evident against ordinary application-level row changes, not proof against a database owner or privileged operator who can alter schema, triggers, and ledger together.',
      'A future secure storage-verification service must hash the actual object bytes and anchor the result independently.'
    )
  );
end;
$function$;

revoke all on function public.staff_task_evidence_fingerprint(uuid,uuid,uuid,uuid,text,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.staff_task_evidence_fingerprint(uuid,uuid,uuid,uuid,text,text,text,text,timestamptz,timestamptz) to service_role;

revoke all on function public.get_hospital_investigation_evidence_fingerprint_audit(uuid,uuid) from public, anon;
grant execute on function public.get_hospital_investigation_evidence_fingerprint_audit(uuid,uuid) to authenticated;

comment on table public.staff_task_evidence_integrity_ledger is
'Append-only SHA-256 fingerprint ledger for canonical staff task evidence metadata. Fingerprints include the storage object key but not the bytes inside external or Supabase Storage objects.';
comment on function public.get_hospital_investigation_evidence_fingerprint_audit(uuid,uuid) is
'Read-only fingerprint verification for hospital investigation evidence. Checks canonical database evidence rows against append-only SHA-256 ledger; does not hash external file bytes.';
