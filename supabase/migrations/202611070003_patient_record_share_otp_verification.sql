alter table public.patient_record_share_access_requests
 add column if not exists otp_verified_at timestamptz,
 add column if not exists otp_verified_phone_last4 text;
create table if not exists public.patient_record_share_otp_challenges (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique references public.patient_record_share_access_requests(id) on delete cascade,
 patient_user_id uuid not null references auth.users(id) on delete cascade,
 otp_hash text not null,
 expires_at timestamptz not null,
 sent_at timestamptz not null default now(),
 send_count integer not null default 1 check(send_count between 1 and 5),
 attempts integer not null default 0 check(attempts between 0 and 5),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists patient_record_share_otp_expiry_idx on public.patient_record_share_otp_challenges(expires_at);
alter table public.patient_record_share_otp_challenges enable row level security;
revoke all on public.patient_record_share_otp_challenges from anon,authenticated;
grant select,insert,update,delete on public.patient_record_share_otp_challenges to service_role;
alter table public.patient_record_share_audit drop constraint if exists patient_record_share_audit_event_type_check;
alter table public.patient_record_share_audit add constraint patient_record_share_audit_event_type_check
 check (event_type = any(array['created','consent_confirmed','accessed','revoked','expired','exhausted','access_requested','access_approved','access_rejected','otp_verified']::text[]));