-- Stage 3I-C-A: private in-app notification outbox foundation
-- No external delivery provider or scheduled worker is enabled by this migration.

create table if not exists public.department_task_notifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  escalation_id uuid not null references public.department_task_escalations(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null default 'task_escalation',
  channel text not null default 'in_app',
  title text not null,
  message text not null,
  dedupe_key text not null,
  delivery_status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_task_notifications_channel_check
    check (channel in ('in_app')),
  constraint department_task_notifications_status_check
    check (delivery_status in ('pending','delivered','failed')),
  constraint department_task_notifications_attempt_count_check
    check (attempt_count >= 0),
  constraint department_task_notifications_dedupe_unique
    unique (clinic_id, recipient_user_id, dedupe_key)
);

create index if not exists department_task_notifications_inbox_idx
  on public.department_task_notifications (clinic_id, recipient_user_id, created_at desc);

create index if not exists department_task_notifications_pending_idx
  on public.department_task_notifications (created_at)
  where delivery_status = 'pending';

create index if not exists department_task_notifications_escalation_idx
  on public.department_task_notifications (clinic_id, escalation_id, created_at desc);

alter table public.department_task_notifications enable row level security;
revoke all on table public.department_task_notifications from public, anon, authenticated;
grant select, insert, update on table public.department_task_notifications to service_role;

comment on table public.department_task_notifications is
  'Private in-app notification outbox for department task escalations. Client access must use scoped SECURITY DEFINER RPCs; direct table access is intentionally revoked.';
