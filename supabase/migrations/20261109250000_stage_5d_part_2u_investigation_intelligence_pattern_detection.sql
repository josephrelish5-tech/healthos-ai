-- Stage 5D Part 2U: explainable investigation pattern detection.
-- Additive, administrator-only, clinic-scoped. Signals are review prompts, never findings of misconduct.

create table if not exists public.staff_task_investigation_pattern_signal_runs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  window_days integer not null check (window_days in (30,90)),
  generated_at timestamptz not null default now()
);

create table if not exists public.staff_task_investigation_pattern_signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.staff_task_investigation_pattern_signal_runs(id) on delete restrict,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  signal_type text not null check (signal_type in (
    'repeat_evidence_integrity_alerts_by_uploader',
    'repeat_alerts_on_same_task',
    'hospital_wide_alert_spike'
  )),
  subject_type text not null check (subject_type in ('staff_profile','task','clinic')),
  subject_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  subject_task_id uuid references public.staff_tasks(id) on delete restrict,
  event_count integer not null check (event_count > 0),
  window_days integer not null check (window_days in (30,90)),
  first_event_at timestamptz not null,
  last_event_at timestamptz not null,
  review_priority text not null check (review_priority in ('watch','elevated','priority_review')),
  indicator_score integer not null check (indicator_score between 0 and 100),
  source_alert_ids uuid[] not null check (cardinality(source_alert_ids) > 0),
  explanation text not null check (length(trim(explanation)) between 10 and 1000),
  created_at timestamptz not null default now(),
  constraint staff_task_investigation_pattern_signal_subject_ck check (
    (subject_type = 'staff_profile' and subject_staff_profile_id is not null and subject_task_id is null)
    or (subject_type = 'task' and subject_task_id is not null and subject_staff_profile_id is null)
    or (subject_type = 'clinic' and subject_task_id is null and subject_staff_profile_id is null)
  )
);

create index if not exists staff_task_investigation_pattern_runs_clinic_idx
  on public.staff_task_investigation_pattern_signal_runs(clinic_id, generated_at desc);
create index if not exists staff_task_investigation_pattern_signals_run_idx
  on public.staff_task_investigation_pattern_signals(run_id, review_priority, event_count desc);

alter table public.staff_task_investigation_pattern_signal_runs enable row level security;
alter table public.staff_task_investigation_pattern_signals enable row level security;
revoke all on public.staff_task_investigation_pattern_signal_runs from public, anon, authenticated;
revoke all on public.staff_task_investigation_pattern_signals from public, anon, authenticated;
grant all on public.staff_task_investigation_pattern_signal_runs to service_role;
grant all on public.staff_task_investigation_pattern_signals to service_role;

create or replace function public.prevent_investigation_pattern_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Investigation pattern signal history is append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_investigation_pattern_runs_append_only
  on public.staff_task_investigation_pattern_signal_runs;
create trigger staff_task_investigation_pattern_runs_append_only
before update or delete on public.staff_task_investigation_pattern_signal_runs
for each row execute function public.prevent_investigation_pattern_history_mutation();

drop trigger if exists staff_task_investigation_pattern_signals_append_only
  on public.staff_task_investigation_pattern_signals;
create trigger staff_task_investigation_pattern_signals_append_only
before update or delete on public.staff_task_investigation_pattern_signals
for each row execute function public.prevent_investigation_pattern_history_mutation();

create or replace function public.run_hospital_investigation_pattern_analysis(
  p_clinic_id uuid,
  p_window_days integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_run_id uuid;
  v_signals jsonb;
  v_count integer := 0;
  v_window integer := coalesce(p_window_days,90);
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null then
    raise exception 'Hospital identifier is required' using errcode = '22023';
  end if;
  if v_window not in (30,90) then
    raise exception 'Analysis window must be 30 or 90 days' using errcode = '22023';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active'
  limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may run investigation pattern analysis'
      using errcode = '42501';
  end if;

  insert into public.staff_task_investigation_pattern_signal_runs(
    clinic_id, requested_by_user_id, window_days
  ) values (p_clinic_id,v_uid,v_window)
  returning id into v_run_id;

  with alert_base as (
    select a.id alert_id, a.task_id, a.evidence_id, a.created_at,
           f.uploaded_by_staff_profile_id
    from public.staff_task_evidence_file_tamper_alerts a
    join public.staff_task_evidence_file_integrity f
      on f.clinic_id = a.clinic_id and f.task_id = a.task_id and f.evidence_id = a.evidence_id
    where a.clinic_id = p_clinic_id
      and a.created_at >= now() - make_interval(days => v_window)
  ),
  staff_patterns as (
    select 'repeat_evidence_integrity_alerts_by_uploader'::text signal_type,
      'staff_profile'::text subject_type,
      b.uploaded_by_staff_profile_id subject_staff_profile_id,
      null::uuid subject_task_id,
      count(distinct b.alert_id)::integer event_count,
      min(b.created_at) first_event_at,
      max(b.created_at) last_event_at,
      array_agg(distinct b.alert_id) source_alert_ids,
      case when count(distinct b.alert_id) >= 5 then 'priority_review'
           when count(distinct b.alert_id) >= 3 then 'elevated' else 'watch' end review_priority,
      least(100, count(distinct b.alert_id) * 20)::integer indicator_score
    from alert_base b
    group by b.uploaded_by_staff_profile_id
    having count(distinct b.alert_id) >= 2
  ),
  task_patterns as (
    select 'repeat_alerts_on_same_task'::text signal_type,
      'task'::text subject_type,
      null::uuid subject_staff_profile_id,
      b.task_id subject_task_id,
      count(distinct b.alert_id)::integer event_count,
      min(b.created_at) first_event_at,
      max(b.created_at) last_event_at,
      array_agg(distinct b.alert_id) source_alert_ids,
      case when count(distinct b.alert_id) >= 4 then 'priority_review'
           when count(distinct b.alert_id) >= 3 then 'elevated' else 'watch' end review_priority,
      least(100, count(distinct b.alert_id) * 25)::integer indicator_score
    from alert_base b
    group by b.task_id
    having count(distinct b.alert_id) >= 2
  ),
  clinic_pattern as (
    select 'hospital_wide_alert_spike'::text signal_type,
      'clinic'::text subject_type,
      null::uuid subject_staff_profile_id,
      null::uuid subject_task_id,
      count(distinct a.id)::integer event_count,
      min(a.created_at) first_event_at,
      max(a.created_at) last_event_at,
      array_agg(distinct a.id) source_alert_ids,
      case when count(distinct a.id) >= 10 then 'priority_review'
           when count(distinct a.id) >= 5 then 'elevated' else 'watch' end review_priority,
      least(100, count(distinct a.id) * 10)::integer indicator_score
    from public.staff_task_evidence_file_tamper_alerts a
    where a.clinic_id = p_clinic_id
      and a.created_at >= now() - interval '30 days'
    having count(distinct a.id) >= 3
  ),
  detected as (
    select * from staff_patterns
    union all select * from task_patterns
    union all select * from clinic_pattern
  )
  insert into public.staff_task_investigation_pattern_signals(
    run_id,clinic_id,signal_type,subject_type,subject_staff_profile_id,subject_task_id,
    event_count,window_days,first_event_at,last_event_at,review_priority,indicator_score,
    source_alert_ids,explanation
  )
  select v_run_id,p_clinic_id,d.signal_type,d.subject_type,d.subject_staff_profile_id,d.subject_task_id,
    d.event_count,case when d.signal_type = 'hospital_wide_alert_spike' then 30 else v_window end,
    d.first_event_at,d.last_event_at,d.review_priority,d.indicator_score,d.source_alert_ids,
    case d.signal_type
      when 'repeat_evidence_integrity_alerts_by_uploader' then
        'The same evidence uploader profile is linked to multiple distinct evidence-integrity alerts in the selected window. This is an indicator for independent review, not evidence of intent or misconduct.'
      when 'repeat_alerts_on_same_task' then
        'Multiple distinct evidence-integrity alerts are linked to the same hospital task in the selected window. Review the task history, evidence chain and operational context.'
      else
        'The hospital recorded at least three evidence-integrity alerts in the last 30 days. Review whether a shared process, storage, training or operational issue explains the increase.'
    end
  from detected d;

  select count(*)::integer into v_count
  from public.staff_task_investigation_pattern_signals s where s.run_id = v_run_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'signal_id',s.id,'signal_type',s.signal_type,'subject_type',s.subject_type,
    'subject_staff_profile_id',s.subject_staff_profile_id,'subject_task_id',s.subject_task_id,
    'event_count',s.event_count,'window_days',s.window_days,
    'first_event_at',s.first_event_at,'last_event_at',s.last_event_at,
    'review_priority',s.review_priority,'indicator_score',s.indicator_score,
    'source_alert_ids',to_jsonb(s.source_alert_ids),'explanation',s.explanation
  ) order by case s.review_priority when 'priority_review' then 1 when 'elevated' then 2 else 3 end,
    s.event_count desc), '[]'::jsonb)
  into v_signals
  from public.staff_task_investigation_pattern_signals s
  where s.run_id = v_run_id and s.clinic_id = p_clinic_id;

  return jsonb_build_object(
    'read_only_analysis',true,'clinic_id',p_clinic_id,'run_id',v_run_id,
    'window_days',v_window,'generated_at',now(),'signal_count',v_count,
    'signals',v_signals,
    'interpretation',
      'Signals are explainable review indicators based only on recorded evidence-integrity alerts. They do not establish fault, intent, fraud or misconduct. Do not use them for automatic discipline, employment decisions or clinical decisions. A qualified human investigator must inspect the source records and document context.'
  );
end;
$function$;

revoke all on function public.run_hospital_investigation_pattern_analysis(uuid,integer) from public,anon;
grant execute on function public.run_hospital_investigation_pattern_analysis(uuid,integer) to authenticated;

comment on table public.staff_task_investigation_pattern_signal_runs is
'Append-only audit record of administrator-requested, clinic-scoped investigation pattern analysis runs.';
comment on table public.staff_task_investigation_pattern_signals is
'Append-only explainable pattern indicators; not findings of misconduct and never automatic punitive decisions.';
