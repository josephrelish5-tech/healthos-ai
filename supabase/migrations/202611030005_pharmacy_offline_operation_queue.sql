-- HealthOS AI: append-only inbox for offline pharmacy action evidence.
-- Uploaded records are pending review only; this table never changes inventory.
create table if not exists public.pharmacy_offline_operation_queue (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null,
  operation_type text not null check (operation_type in ('receipt_intent','dispensing_intent','adjustment_request','transfer_request')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 12000),
  captured_at timestamptz not null,
  uploaded_at timestamptz not null default now(),
  status text not null default 'pending_review' check (status = 'pending_review'),
  unique (clinic_id, idempotency_key)
);

create index if not exists pharmacy_offline_queue_clinic_status_idx
  on public.pharmacy_offline_operation_queue (clinic_id, status, uploaded_at desc);

alter table public.pharmacy_offline_operation_queue enable row level security;

drop policy if exists "pharmacy offline queue members can read" on public.pharmacy_offline_operation_queue;
create policy "pharmacy offline queue members can read"
  on public.pharmacy_offline_operation_queue for select to authenticated
  using (exists (
    select 1 from public.clinic_memberships m
    where m.clinic_id = pharmacy_offline_operation_queue.clinic_id
      and m.user_id = auth.uid() and m.status = 'active'
  ));

drop policy if exists "pharmacy offline queue members can insert own" on public.pharmacy_offline_operation_queue;
create policy "pharmacy offline queue members can insert own"
  on public.pharmacy_offline_operation_queue for insert to authenticated
  with check (
    actor_id = auth.uid()
    and status = 'pending_review'
    and exists (
      select 1 from public.clinic_memberships m
      where m.clinic_id = pharmacy_offline_operation_queue.clinic_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- No UPDATE or DELETE policy: uploaded evidence is append-only.
