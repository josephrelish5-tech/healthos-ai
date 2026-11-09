-- HealthOS AI Stage 5D Part 2T
-- Protect staff duty evidence and task-event history from silent mutation.

create or replace function public.prevent_staff_task_evidence_row_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception
    'Staff task evidence is immutable. Submit a new evidence record or a traceable correction event instead.'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_staff_task_evidence_truncate()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception
    'Staff task evidence history cannot be truncated.'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_staff_task_event_row_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception
    'Staff task event history is immutable. Record a new corrective event instead.'
    using errcode = '55000';
end;
$function$;

create or replace function public.prevent_staff_task_event_truncate()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception
    'Staff task event history cannot be truncated.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_evidence_block_update_delete
  on public.staff_task_evidence;
create trigger staff_task_evidence_block_update_delete
before update or delete on public.staff_task_evidence
for each row execute function public.prevent_staff_task_evidence_row_mutation();

drop trigger if exists staff_task_evidence_block_truncate
  on public.staff_task_evidence;
create trigger staff_task_evidence_block_truncate
before truncate on public.staff_task_evidence
for each statement execute function public.prevent_staff_task_evidence_truncate();

drop trigger if exists staff_task_events_block_update_delete
  on public.staff_task_events;
create trigger staff_task_events_block_update_delete
before update or delete on public.staff_task_events
for each row execute function public.prevent_staff_task_event_row_mutation();

drop trigger if exists staff_task_events_block_truncate
  on public.staff_task_events;
create trigger staff_task_events_block_truncate
before truncate on public.staff_task_events
for each statement execute function public.prevent_staff_task_event_truncate();

revoke all on function public.prevent_staff_task_evidence_row_mutation() from public, anon, authenticated, service_role;
revoke all on function public.prevent_staff_task_evidence_truncate() from public, anon, authenticated, service_role;
revoke all on function public.prevent_staff_task_event_row_mutation() from public, anon, authenticated, service_role;
revoke all on function public.prevent_staff_task_event_truncate() from public, anon, authenticated, service_role;

comment on function public.prevent_staff_task_evidence_row_mutation()
  is 'Blocks UPDATE and DELETE on submitted staff task evidence; corrections must be separately recorded.';
comment on function public.prevent_staff_task_evidence_truncate()
  is 'Blocks TRUNCATE on staff task evidence.';
comment on function public.prevent_staff_task_event_row_mutation()
  is 'Blocks UPDATE and DELETE on staff task event history.';
comment on function public.prevent_staff_task_event_truncate()
  is 'Blocks TRUNCATE on staff task event history.';
