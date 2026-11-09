-- Stage 5D Part 2X: preventive-action effectiveness, recurrence monitoring and management oversight.
-- Additive only. Recurrence clusters are prompts for human review, not automatic conclusions.

create table if not exists public.staff_task_investigation_action_effectiveness_reviews (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  finding_id uuid not null references public.staff_task_investigation_findings(id) on delete restrict,
  action_id uuid not null references public.staff_task_investigation_preventive_actions(id) on delete restrict,
  reviewed_by_user_id uuid not null references auth.users(id) on delete restrict,
  outcome text not null check (outcome in ('effective','partially_effective','ineffective','not_yet_verifiable')),
  recurrence_status text not null check (recurrence_status in ('none_observed','recurrence_observed','insufficient_observation')),
  assessment_note text not null check (length(trim(assessment_note)) between 20 and 4000),
  evidence_review_note text not null check (length(trim(evidence_review_note)) between 10 and 3000),
  next_review_date date,
  created_at timestamptz not null default now()
);
create index if not exists staff_task_investigation_effectiveness_action_idx
  on public.staff_task_investigation_action_effectiveness_reviews(clinic_id, action_id, created_at desc);
create index if not exists staff_task_investigation_effectiveness_finding_idx
  on public.staff_task_investigation_action_effectiveness_reviews(clinic_id, finding_id, created_at desc);

create table if not exists public.staff_task_investigation_management_oversight_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  finding_id uuid not null references public.staff_task_investigation_findings(id) on delete restrict,
  recorded_by_user_id uuid not null references auth.users(id) on delete restrict,
  oversight_decision text not null check (oversight_decision in (
    'continue_monitoring','allocate_additional_resources','revise_preventive_plan',
    'reopen_investigation','escalate_governance','close_monitoring'
  )),
  management_note text not null check (length(trim(management_note)) between 20 and 4000),
  next_review_date date,
  created_at timestamptz not null default now()
);
create index if not exists staff_task_investigation_oversight_finding_idx
  on public.staff_task_investigation_management_oversight_events(clinic_id, finding_id, created_at desc);

alter table public.staff_task_investigation_action_effectiveness_reviews enable row level security;
alter table public.staff_task_investigation_management_oversight_events enable row level security;
revoke all on public.staff_task_investigation_action_effectiveness_reviews from public, anon, authenticated;
revoke all on public.staff_task_investigation_management_oversight_events from public, anon, authenticated;
grant all on public.staff_task_investigation_action_effectiveness_reviews to service_role;
grant all on public.staff_task_investigation_management_oversight_events to service_role;

create or replace function public.prevent_investigation_effectiveness_history_mutation()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  raise exception 'Effectiveness assessments and management oversight history are append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_investigation_effectiveness_append_only
  on public.staff_task_investigation_action_effectiveness_reviews;
create trigger staff_task_investigation_effectiveness_append_only
before update or delete on public.staff_task_investigation_action_effectiveness_reviews
for each row execute function public.prevent_investigation_effectiveness_history_mutation();

drop trigger if exists staff_task_investigation_oversight_append_only
  on public.staff_task_investigation_management_oversight_events;
create trigger staff_task_investigation_oversight_append_only
before update or delete on public.staff_task_investigation_management_oversight_events
for each row execute function public.prevent_investigation_effectiveness_history_mutation();

create or replace function public.get_hospital_investigation_effectiveness_register(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_findings jsonb;
  v_clusters jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null then raise exception 'Hospital identifier is required' using errcode = '22023'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may view effectiveness and recurrence records' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'finding_id',f.id,'finding_summary',f.finding_summary,
    'root_cause_category',f.root_cause_category,'accountable_department',f.accountable_department,
    'created_at',f.created_at,
    'actions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'action_id',pa.id,'action_description',pa.action_description,
        'status',pa.status,'due_date',pa.due_date,'assignee_name',sp.full_name,
        'effectiveness_reviews',coalesce((
          select jsonb_agg(jsonb_build_object(
            'review_id',er.id,'outcome',er.outcome,'recurrence_status',er.recurrence_status,
            'assessment_note',er.assessment_note,'evidence_review_note',er.evidence_review_note,
            'reviewed_at',er.created_at,'next_review_date',er.next_review_date,
            'reviewer_name',rp.full_name
          ) order by er.created_at desc)
          from public.staff_task_investigation_action_effectiveness_reviews er
          left join public.staff_profiles rp on rp.user_id = er.reviewed_by_user_id and rp.clinic_id = er.clinic_id
          where er.action_id = pa.id and er.clinic_id = p_clinic_id
        ),'[]'::jsonb)
      ) order by pa.created_at desc)
      from public.staff_task_investigation_preventive_actions pa
      left join public.staff_profiles sp on sp.id = pa.assigned_to_staff_profile_id and sp.clinic_id = pa.clinic_id
      where pa.finding_id = f.id and pa.clinic_id = p_clinic_id
    ),'[]'::jsonb),
    'oversight_events',coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_id',oe.id,'decision',oe.oversight_decision,'management_note',oe.management_note,
        'next_review_date',oe.next_review_date,'recorded_at',oe.created_at,
        'manager_name',mp.full_name
      ) order by oe.created_at desc)
      from public.staff_task_investigation_management_oversight_events oe
      left join public.staff_profiles mp on mp.user_id = oe.recorded_by_user_id and mp.clinic_id = oe.clinic_id
      where oe.finding_id = f.id and oe.clinic_id = p_clinic_id
    ),'[]'::jsonb)
  ) order by f.created_at desc),'[]'::jsonb)
  into v_findings
  from public.staff_task_investigation_findings f
  where f.clinic_id = p_clinic_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'root_cause_category',g.root_cause_category,
    'accountable_department',g.accountable_department,
    'finding_count',g.finding_count,
    'first_recorded_at',g.first_recorded_at,
    'latest_recorded_at',g.latest_recorded_at,
    'finding_ids',g.finding_ids,
    'review_prompt','Repeated independently accepted findings share this category and department; inspect dates and source evidence before deciding whether this is recurrence.'
  ) order by g.finding_count desc,g.latest_recorded_at desc),'[]'::jsonb)
  into v_clusters
  from (
    select f.root_cause_category, lower(trim(f.accountable_department)) accountable_department,
      min(f.created_at) first_recorded_at,max(f.created_at) latest_recorded_at,
      count(*)::integer finding_count,array_agg(f.id order by f.created_at desc) finding_ids
    from public.staff_task_investigation_findings f
    where f.clinic_id = p_clinic_id and f.created_at >= now() - interval '365 days'
    group by f.root_cause_category,lower(trim(f.accountable_department))
    having count(*) >= 2
  ) g;

  return jsonb_build_object('read_only',true,'clinic_id',p_clinic_id,
    'findings',v_findings,'potential_recurrence_clusters',v_clusters,'generated_at',now());
end;
$function$;

create or replace function public.record_hospital_investigation_action_effectiveness_review(
  p_clinic_id uuid,p_action_id uuid,p_outcome text,p_recurrence_status text,
  p_assessment_note text,p_evidence_review_note text,p_next_review_date date
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_action public.staff_task_investigation_preventive_actions%rowtype;
  v_review_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_outcome not in ('effective','partially_effective','ineffective','not_yet_verifiable')
     or p_recurrence_status not in ('none_observed','recurrence_observed','insufficient_observation')
     or length(trim(coalesce(p_assessment_note,''))) < 20 or length(p_assessment_note) > 4000
     or length(trim(coalesce(p_evidence_review_note,''))) < 10 or length(p_evidence_review_note) > 3000 then
    raise exception 'Provide a valid effectiveness outcome, recurrence status and evidence-based notes' using errcode = '22023';
  end if;
  select pa.* into v_action from public.staff_task_investigation_preventive_actions pa
  where pa.id = p_action_id and pa.clinic_id = p_clinic_id;
  if not found then raise exception 'Preventive action not found in this hospital' using errcode = 'P0002'; end if;
  if v_action.status <> 'completed' or not exists (
    select 1 from public.staff_task_investigation_preventive_action_events ev
    where ev.action_id = p_action_id and ev.clinic_id = p_clinic_id
      and ev.new_status = 'completed' and ev.independently_verified_by_user_id is not null
  ) then
    raise exception 'An independently verified completed action is required before effectiveness review' using errcode = '55000';
  end if;
  if exists (select 1 from public.staff_profiles sp where sp.id = v_action.assigned_to_staff_profile_id and sp.user_id = v_uid and sp.clinic_id = p_clinic_id) then
    raise exception 'The staff member assigned to this preventive action cannot independently assess its effectiveness' using errcode = '42501';
  end if;
  if p_recurrence_status = 'recurrence_observed' and p_outcome = 'effective' then
    raise exception 'A recurrence observation cannot be recorded as fully effective without explaining a changed scope; use partially effective or ineffective' using errcode = '22023';
  end if;
  insert into public.staff_task_investigation_action_effectiveness_reviews(
    clinic_id,finding_id,action_id,reviewed_by_user_id,outcome,recurrence_status,
    assessment_note,evidence_review_note,next_review_date
  ) values (
    p_clinic_id,v_action.finding_id,p_action_id,v_uid,p_outcome,p_recurrence_status,
    trim(p_assessment_note),trim(p_evidence_review_note),p_next_review_date
  ) returning id into v_review_id;
  return jsonb_build_object('success',true,'review_id',v_review_id,'action_id',p_action_id,'finding_id',v_action.finding_id,'recorded_at',now());
end;
$function$;

create or replace function public.record_hospital_investigation_management_oversight(
  p_clinic_id uuid,p_finding_id uuid,p_decision text,p_management_note text,p_next_review_date date
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_event_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_decision not in ('continue_monitoring','allocate_additional_resources','revise_preventive_plan','reopen_investigation','escalate_governance','close_monitoring')
     or length(trim(coalesce(p_management_note,''))) < 20 or length(p_management_note) > 4000 then
    raise exception 'Provide a valid management decision and rationale' using errcode = '22023';
  end if;
  if not exists (select 1 from public.staff_task_investigation_findings f where f.id = p_finding_id and f.clinic_id = p_clinic_id) then
    raise exception 'Finding not found in this hospital' using errcode = 'P0002';
  end if;
  if p_decision = 'close_monitoring' and (
    not exists (select 1 from public.staff_task_investigation_preventive_actions pa where pa.finding_id = p_finding_id and pa.clinic_id = p_clinic_id)
    or exists (
      select 1 from public.staff_task_investigation_preventive_actions pa
      where pa.finding_id = p_finding_id and pa.clinic_id = p_clinic_id
        and (pa.status <> 'completed' or not exists (
          select 1 from public.staff_task_investigation_action_effectiveness_reviews er
          where er.action_id = pa.id and er.clinic_id = p_clinic_id
            and er.outcome = 'effective' and er.recurrence_status = 'none_observed'
            and er.id = (select er2.id from public.staff_task_investigation_action_effectiveness_reviews er2 where er2.action_id = pa.id and er2.clinic_id = p_clinic_id order by er2.created_at desc,er2.id desc limit 1)
        ))
    )
  ) then
    raise exception 'Monitoring cannot be closed until every preventive action is independently completed and its latest effectiveness review is effective with no recurrence observed' using errcode = '55000';
  end if;
  insert into public.staff_task_investigation_management_oversight_events(
    clinic_id,finding_id,recorded_by_user_id,oversight_decision,management_note,next_review_date
  ) values (p_clinic_id,p_finding_id,v_uid,p_decision,trim(p_management_note),p_next_review_date)
  returning id into v_event_id;
  return jsonb_build_object('success',true,'oversight_event_id',v_event_id,'finding_id',p_finding_id,'recorded_at',now());
end;
$function$;

revoke all on function public.get_hospital_investigation_effectiveness_register(uuid) from public,anon;
revoke all on function public.record_hospital_investigation_action_effectiveness_review(uuid,uuid,text,text,text,text,date) from public,anon;
revoke all on function public.record_hospital_investigation_management_oversight(uuid,uuid,text,text,date) from public,anon;
grant execute on function public.get_hospital_investigation_effectiveness_register(uuid) to authenticated;
grant execute on function public.record_hospital_investigation_action_effectiveness_review(uuid,uuid,text,text,text,text,date) to authenticated;
grant execute on function public.record_hospital_investigation_management_oversight(uuid,uuid,text,text,date) to authenticated;

comment on table public.staff_task_investigation_action_effectiveness_reviews is
'Append-only evidence-based effectiveness assessments of independently verified preventive actions.';
comment on table public.staff_task_investigation_management_oversight_events is
'Append-only management decisions and scheduled oversight reviews for investigation findings.';
