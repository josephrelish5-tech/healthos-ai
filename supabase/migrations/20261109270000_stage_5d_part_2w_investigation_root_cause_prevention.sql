-- Stage 5D Part 2W: evidence-backed findings, root-cause analysis and preventive actions.
-- Additive only. Signals are not findings; only independently accepted human reviews may seed a finding.

create table if not exists public.staff_task_investigation_findings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  signal_id uuid not null references public.staff_task_investigation_pattern_signals(id) on delete restrict,
  review_id uuid not null references public.staff_task_investigation_signal_reviews(id) on delete restrict,
  recorded_by_user_id uuid not null references auth.users(id) on delete restrict,
  root_cause_category text not null check (root_cause_category in (
    'process_gap','training_gap','staffing_capacity','equipment_or_infrastructure',
    'system_or_technology','policy_or_governance','communication_handoff',
    'documentation_or_data_quality','external_dependency','other'
  )),
  root_cause_analysis text not null check (length(trim(root_cause_analysis)) between 30 and 5000),
  finding_summary text not null check (length(trim(finding_summary)) between 15 and 2000),
  accountable_department text not null check (length(trim(accountable_department)) between 2 and 160),
  supporting_evidence_note text not null check (length(trim(supporting_evidence_note)) between 10 and 3000),
  source_alert_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (clinic_id, review_id)
);

create index if not exists staff_task_investigation_findings_clinic_idx
  on public.staff_task_investigation_findings(clinic_id, created_at desc);

create table if not exists public.staff_task_investigation_preventive_actions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  finding_id uuid not null references public.staff_task_investigation_findings(id) on delete restrict,
  action_description text not null check (length(trim(action_description)) between 15 and 3000),
  accountable_department text not null check (length(trim(accountable_department)) between 2 and 160),
  assigned_to_staff_profile_id uuid not null references public.staff_profiles(id) on delete restrict,
  due_date date,
  status text not null default 'planned' check (status in ('planned','in_progress','blocked','completed','cancelled')),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists staff_task_investigation_preventive_actions_finding_idx
  on public.staff_task_investigation_preventive_actions(clinic_id, finding_id, created_at desc);

create table if not exists public.staff_task_investigation_preventive_action_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  action_id uuid not null references public.staff_task_investigation_preventive_actions(id) on delete restrict,
  changed_by_user_id uuid not null references auth.users(id) on delete restrict,
  previous_status text,
  new_status text not null check (new_status in ('planned','in_progress','blocked','completed','cancelled')),
  event_note text not null check (length(trim(event_note)) between 10 and 3000),
  independently_verified_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (new_status <> 'completed' or independently_verified_by_user_id is not null)
);

alter table public.staff_task_investigation_findings enable row level security;
alter table public.staff_task_investigation_preventive_actions enable row level security;
alter table public.staff_task_investigation_preventive_action_events enable row level security;
revoke all on public.staff_task_investigation_findings from public, anon, authenticated;
revoke all on public.staff_task_investigation_preventive_actions from public, anon, authenticated;
revoke all on public.staff_task_investigation_preventive_action_events from public, anon, authenticated;
grant all on public.staff_task_investigation_findings to service_role;
grant all on public.staff_task_investigation_preventive_actions to service_role;
grant all on public.staff_task_investigation_preventive_action_events to service_role;

create or replace function public.prevent_investigation_finding_history_mutation()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  raise exception 'Investigation findings and preventive-action history are append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_investigation_findings_append_only
  on public.staff_task_investigation_findings;
create trigger staff_task_investigation_findings_append_only
before update or delete on public.staff_task_investigation_findings
for each row execute function public.prevent_investigation_finding_history_mutation();

drop trigger if exists staff_task_investigation_preventive_action_events_append_only
  on public.staff_task_investigation_preventive_action_events;
create trigger staff_task_investigation_preventive_action_events_append_only
before update or delete on public.staff_task_investigation_preventive_action_events
for each row execute function public.prevent_investigation_finding_history_mutation();

create or replace function public.get_hospital_investigation_root_cause_register(p_clinic_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_eligible jsonb;
  v_findings jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null then raise exception 'Hospital identifier is required' using errcode = '22023'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may view root-cause records' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'signal_id',s.id,'signal_type',s.signal_type,'explanation',s.explanation,
    'review_id',r.id,'review_decision',r.decision,'reviewed_at',r.created_at,
    'approval_outcome',a.outcome,'source_alert_ids',s.source_alert_ids
  ) order by r.created_at desc),'[]'::jsonb)
  into v_eligible
  from public.staff_task_investigation_signal_reviews r
  join public.staff_task_investigation_pattern_signals s
    on s.id = r.signal_id and s.clinic_id = r.clinic_id
  join public.staff_task_investigation_signal_review_approvals a
    on a.review_id = r.id and a.clinic_id = r.clinic_id and a.outcome = 'accepted'
  left join public.staff_task_investigation_findings f on f.clinic_id = r.clinic_id and f.review_id = r.id
  where r.clinic_id = p_clinic_id and r.decision = 'confirmed_operational_weakness' and f.id is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'finding_id',f.id,'finding_summary',f.finding_summary,
    'root_cause_category',f.root_cause_category,'root_cause_analysis',f.root_cause_analysis,
    'accountable_department',f.accountable_department,
    'supporting_evidence_note',f.supporting_evidence_note,
    'source_alert_ids',f.source_alert_ids,'created_at',f.created_at,
    'actions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'action_id',pa.id,'action_description',pa.action_description,
        'accountable_department',pa.accountable_department,'assignee_name',sp.full_name,
        'assigned_to_staff_profile_id',pa.assigned_to_staff_profile_id,
        'due_date',pa.due_date,'status',pa.status,'created_at',pa.created_at,
        'events',coalesce((
          select jsonb_agg(jsonb_build_object(
            'previous_status',ev.previous_status,'new_status',ev.new_status,
            'event_note',ev.event_note,'changed_at',ev.created_at,
            'verified_by_name',vp.full_name
          ) order by ev.created_at desc)
          from public.staff_task_investigation_preventive_action_events ev
          left join public.staff_profiles vp on vp.user_id = ev.independently_verified_by_user_id and vp.clinic_id = ev.clinic_id
          where ev.action_id = pa.id and ev.clinic_id = p_clinic_id
        ),'[]'::jsonb)
      ) order by pa.created_at desc)
      from public.staff_task_investigation_preventive_actions pa
      left join public.staff_profiles sp on sp.id = pa.assigned_to_staff_profile_id and sp.clinic_id = pa.clinic_id
      where pa.finding_id = f.id and pa.clinic_id = p_clinic_id
    ),'[]'::jsonb)
  ) order by f.created_at desc),'[]'::jsonb)
  into v_findings
  from public.staff_task_investigation_findings f
  where f.clinic_id = p_clinic_id;

  return jsonb_build_object('read_only',true,'clinic_id',p_clinic_id,
    'eligible_reviews',v_eligible,'findings',v_findings,'generated_at',now());
end;
$function$;

create or replace function public.record_hospital_investigation_root_cause_finding(
  p_clinic_id uuid,p_review_id uuid,p_root_cause_category text,
  p_root_cause_analysis text,p_finding_summary text,
  p_accountable_department text,p_supporting_evidence_note text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_review public.staff_task_investigation_signal_reviews%rowtype;
  v_signal public.staff_task_investigation_pattern_signals%rowtype;
  v_finding_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode = '42501'; end if;
  select r.* into v_review from public.staff_task_investigation_signal_reviews r
  join public.staff_task_investigation_signal_review_approvals a
    on a.review_id = r.id and a.clinic_id = r.clinic_id and a.outcome = 'accepted'
  where r.id = p_review_id and r.clinic_id = p_clinic_id
    and r.decision = 'confirmed_operational_weakness';
  if not found then raise exception 'An independently accepted human review is required before recording a finding' using errcode = '42501'; end if;
  select s.* into v_signal from public.staff_task_investigation_pattern_signals s
  where s.id = v_review.signal_id and s.clinic_id = p_clinic_id;
  if not found then raise exception 'Source investigation signal is unavailable' using errcode = 'P0002'; end if;
  if p_root_cause_category not in ('process_gap','training_gap','staffing_capacity','equipment_or_infrastructure','system_or_technology','policy_or_governance','communication_handoff','documentation_or_data_quality','external_dependency','other')
     or length(trim(coalesce(p_root_cause_analysis,''))) < 30 or length(p_root_cause_analysis) > 5000
     or length(trim(coalesce(p_finding_summary,''))) < 15 or length(p_finding_summary) > 2000
     or length(trim(coalesce(p_accountable_department,''))) < 2 or length(p_accountable_department) > 160
     or length(trim(coalesce(p_supporting_evidence_note,''))) < 10 or length(p_supporting_evidence_note) > 3000 then
    raise exception 'Complete all finding fields with the required detail' using errcode = '22023';
  end if;
  insert into public.staff_task_investigation_findings(
    clinic_id,signal_id,review_id,recorded_by_user_id,root_cause_category,
    root_cause_analysis,finding_summary,accountable_department,
    supporting_evidence_note,source_alert_ids
  ) values (
    p_clinic_id,v_signal.id,p_review_id,v_uid,p_root_cause_category,
    trim(p_root_cause_analysis),trim(p_finding_summary),trim(p_accountable_department),
    trim(p_supporting_evidence_note),v_signal.source_alert_ids
  ) returning id into v_finding_id;
  return jsonb_build_object('success',true,'finding_id',v_finding_id,'signal_id',v_signal.id,'review_id',p_review_id,'recorded_at',now());
end;
$function$;

create or replace function public.create_hospital_investigation_preventive_action(
  p_clinic_id uuid,p_finding_id uuid,p_action_description text,
  p_accountable_department text,p_assigned_to_staff_profile_id uuid,p_due_date date
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_action_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if not exists (select 1 from public.staff_task_investigation_findings f where f.id = p_finding_id and f.clinic_id = p_clinic_id) then
    raise exception 'Finding not found in this hospital' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.staff_profiles sp where sp.id = p_assigned_to_staff_profile_id and sp.clinic_id = p_clinic_id and sp.employment_status = 'active') then
    raise exception 'Select an active staff member from this hospital' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_action_description,''))) < 15 or length(p_action_description) > 3000
     or length(trim(coalesce(p_accountable_department,''))) < 2 or length(p_accountable_department) > 160 then
    raise exception 'Provide a clear action and accountable department' using errcode = '22023';
  end if;
  insert into public.staff_task_investigation_preventive_actions(
    clinic_id,finding_id,action_description,accountable_department,
    assigned_to_staff_profile_id,due_date,created_by_user_id
  ) values (
    p_clinic_id,p_finding_id,trim(p_action_description),trim(p_accountable_department),
    p_assigned_to_staff_profile_id,p_due_date,v_uid
  ) returning id into v_action_id;
  insert into public.staff_task_investigation_preventive_action_events(
    clinic_id,action_id,changed_by_user_id,previous_status,new_status,event_note
  ) values (p_clinic_id,v_action_id,v_uid,null,'planned','Preventive action created and assigned.');
  return jsonb_build_object('success',true,'action_id',v_action_id,'finding_id',p_finding_id,'status','planned');
end;
$function$;

create or replace function public.update_hospital_investigation_preventive_action(
  p_clinic_id uuid,p_action_id uuid,p_new_status text,p_event_note text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_action public.staff_task_investigation_preventive_actions%rowtype;
  v_verifier uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then raise exception 'Administrator access required' using errcode = '42501'; end if;
  if p_new_status not in ('planned','in_progress','blocked','completed','cancelled')
     or length(trim(coalesce(p_event_note,''))) < 10 or length(p_event_note) > 3000 then
    raise exception 'Provide a valid action status and explanatory note' using errcode = '22023';
  end if;
  select pa.* into v_action from public.staff_task_investigation_preventive_actions pa
  where pa.id = p_action_id and pa.clinic_id = p_clinic_id for update;
  if not found then raise exception 'Preventive action not found in this hospital' using errcode = 'P0002'; end if;
  if v_action.status in ('completed','cancelled') then raise exception 'Completed or cancelled actions are closed; create a new action to continue' using errcode = '55000'; end if;
  if p_new_status = 'completed' then
    if exists (select 1 from public.staff_profiles sp where sp.id = v_action.assigned_to_staff_profile_id and sp.user_id = v_uid) then
      raise exception 'The assigned staff member cannot independently verify completion' using errcode = '42501';
    end if;
    v_verifier := v_uid;
  end if;
  insert into public.staff_task_investigation_preventive_action_events(
    clinic_id,action_id,changed_by_user_id,previous_status,new_status,event_note,
    independently_verified_by_user_id
  ) values (p_clinic_id,p_action_id,v_uid,v_action.status,p_new_status,trim(p_event_note),v_verifier);
  update public.staff_task_investigation_preventive_actions set status = p_new_status
  where id = p_action_id and clinic_id = p_clinic_id;
  return jsonb_build_object('success',true,'action_id',p_action_id,'status',p_new_status,'independent_verification',p_new_status = 'completed');
end;
$function$;

revoke all on function public.get_hospital_investigation_root_cause_register(uuid) from public,anon;
revoke all on function public.record_hospital_investigation_root_cause_finding(uuid,uuid,text,text,text,text,text) from public,anon;
revoke all on function public.create_hospital_investigation_preventive_action(uuid,uuid,text,text,uuid,date) from public,anon;
revoke all on function public.update_hospital_investigation_preventive_action(uuid,uuid,text,text) from public,anon;
grant execute on function public.get_hospital_investigation_root_cause_register(uuid) to authenticated;
grant execute on function public.record_hospital_investigation_root_cause_finding(uuid,uuid,text,text,text,text,text) to authenticated;
grant execute on function public.create_hospital_investigation_preventive_action(uuid,uuid,text,text,uuid,date) to authenticated;
grant execute on function public.update_hospital_investigation_preventive_action(uuid,uuid,text,text) to authenticated;

comment on table public.staff_task_investigation_findings is
'Append-only evidence-backed investigation findings seeded only from independently accepted human reviews.';
comment on table public.staff_task_investigation_preventive_actions is
'Clinic-scoped preventive actions with accountable department, active staff owner and due date.';
comment on table public.staff_task_investigation_preventive_action_events is
'Append-only action lifecycle events; completion requires a different administrator from the assigned staff member.';
