-- Stage 5D Part 2T: investigation corrective actions and independent closure verification.
-- Additive dependency on Parts 2P, 2Q, 2R and 2S.
-- Does not modify clinical, billing, pharmacy, task execution or existing evidence content.

create table if not exists public.staff_task_investigation_corrective_actions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  alert_id uuid not null references public.staff_task_evidence_file_tamper_alerts(id) on delete restrict,
  action_description text not null check (length(trim(action_description)) between 5 and 2000),
  assigned_to_staff_profile_id uuid not null references public.staff_profiles(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  action_status text not null default 'planned' check (action_status in ('planned','in_progress','completed','cancelled')),
  due_date date,
  completion_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint staff_task_investigation_corrective_actions_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict,
  constraint staff_task_investigation_corrective_actions_completion_ck
    check (
      (action_status = 'completed' and completed_at is not null and length(trim(coalesce(completion_note,''))) >= 5)
      or (action_status <> 'completed' and completed_at is null)
    )
);

create index if not exists staff_task_investigation_corrective_actions_alert_idx
  on public.staff_task_investigation_corrective_actions(clinic_id, alert_id, action_status, created_at);

create table if not exists public.staff_task_investigation_corrective_action_history (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  alert_id uuid not null references public.staff_task_evidence_file_tamper_alerts(id) on delete restrict,
  corrective_action_id uuid not null references public.staff_task_investigation_corrective_actions(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  action_type text not null check (action_type in ('created','started','completed','reopened','cancelled','reassigned')),
  previous_status text,
  resulting_status text not null check (resulting_status in ('planned','in_progress','completed','cancelled')),
  action_note text,
  created_at timestamptz not null default now(),
  constraint staff_task_investigation_corrective_action_history_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict
);

create index if not exists staff_task_investigation_corrective_action_history_alert_idx
  on public.staff_task_investigation_corrective_action_history(clinic_id, alert_id, created_at desc);

create table if not exists public.staff_task_investigation_closure_verifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  alert_id uuid not null references public.staff_task_evidence_file_tamper_alerts(id) on delete restrict,
  evidence_id uuid not null references public.staff_task_evidence(id) on delete restrict,
  verified_by_user_id uuid not null references auth.users(id) on delete restrict,
  verified_by_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  file_verification_id uuid not null references public.staff_task_evidence_file_verifications(id) on delete restrict,
  verification_outcome text not null check (verification_outcome in ('accepted','rejected')),
  findings_summary text not null check (length(trim(findings_summary)) between 10 and 3000),
  corrective_actions_reviewed integer not null check (corrective_actions_reviewed > 0),
  verified_at timestamptz not null default now(),
  constraint staff_task_investigation_closure_verifications_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict
);

create index if not exists staff_task_investigation_closure_verifications_alert_idx
  on public.staff_task_investigation_closure_verifications(clinic_id, alert_id, verified_at desc);

alter table public.staff_task_investigation_corrective_actions enable row level security;
alter table public.staff_task_investigation_corrective_action_history enable row level security;
alter table public.staff_task_investigation_closure_verifications enable row level security;
revoke all on public.staff_task_investigation_corrective_actions from public, anon, authenticated;
revoke all on public.staff_task_investigation_corrective_action_history from public, anon, authenticated;
revoke all on public.staff_task_investigation_closure_verifications from public, anon, authenticated;
grant all on public.staff_task_investigation_corrective_actions to service_role;
grant all on public.staff_task_investigation_corrective_action_history to service_role;
grant all on public.staff_task_investigation_closure_verifications to service_role;

create or replace function public.prevent_staff_task_investigation_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Investigation corrective-action and closure history is append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_investigation_corrective_action_history_append_only
  on public.staff_task_investigation_corrective_action_history;
create trigger staff_task_investigation_corrective_action_history_append_only
before update or delete on public.staff_task_investigation_corrective_action_history
for each row execute function public.prevent_staff_task_investigation_history_mutation();

drop trigger if exists staff_task_investigation_closure_verifications_append_only
  on public.staff_task_investigation_closure_verifications;
create trigger staff_task_investigation_closure_verifications_append_only
before update or delete on public.staff_task_investigation_closure_verifications
for each row execute function public.prevent_staff_task_investigation_history_mutation();

create or replace function public.manage_hospital_investigation_corrective_action(
  p_clinic_id uuid,
  p_alert_id uuid,
  p_action text,
  p_action_id uuid default null,
  p_description text default null,
  p_assigned_to_staff_profile_id uuid default null,
  p_due_date date default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_actor_profile_id uuid;
  v_alert public.staff_task_evidence_file_tamper_alerts%rowtype;
  v_item public.staff_task_investigation_corrective_actions%rowtype;
  v_previous text;
  v_next text;
  v_history_id uuid;
  v_note text := nullif(trim(coalesce(p_note,'')), '');
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_alert_id is null then raise exception 'Hospital and alert are required' using errcode = '22023'; end if;
  if p_action is null or p_action not in ('create','start','complete','reopen','cancel') then
    raise exception 'Unsupported corrective-action operation' using errcode = '22023';
  end if;
  if v_note is not null and length(v_note) > 2000 then raise exception 'Note exceeds 2,000 characters' using errcode = '22023'; end if;

  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may manage corrective actions' using errcode = '42501';
  end if;

  select sp.id into v_actor_profile_id from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid and sp.employment_status = 'active' limit 1;

  select a.* into v_alert from public.staff_task_evidence_file_tamper_alerts a
  where a.id = p_alert_id and a.clinic_id = p_clinic_id for update;
  if not found then raise exception 'Investigation alert not found' using errcode = 'P0002'; end if;
  if v_alert.alert_status = 'resolved' then raise exception 'Reopen the investigation alert before changing corrective actions' using errcode = '55000'; end if;

  if p_action = 'create' then
    if length(trim(coalesce(p_description,''))) < 5 or length(p_description) > 2000 then
      raise exception 'Provide a corrective action description between 5 and 2,000 characters' using errcode = '22023';
    end if;
    if p_assigned_to_staff_profile_id is null or not exists (
      select 1 from public.staff_profiles sp where sp.id = p_assigned_to_staff_profile_id
      and sp.clinic_id = p_clinic_id and sp.employment_status = 'active'
    ) then raise exception 'Choose an active staff member from this hospital' using errcode = '22023'; end if;

    insert into public.staff_task_investigation_corrective_actions(
      clinic_id,task_id,alert_id,action_description,assigned_to_staff_profile_id,created_by_user_id,due_date
    ) values (
      p_clinic_id,v_alert.task_id,v_alert.id,trim(p_description),p_assigned_to_staff_profile_id,v_uid,p_due_date
    ) returning * into v_item;
    v_previous := null; v_next := 'planned';
  else
    if p_action_id is null then raise exception 'Corrective action identifier is required' using errcode = '22023'; end if;
    select x.* into v_item from public.staff_task_investigation_corrective_actions x
    where x.id = p_action_id and x.clinic_id = p_clinic_id and x.alert_id = p_alert_id
    for update;
    if not found then raise exception 'Corrective action not found for this alert' using errcode = 'P0002'; end if;
    v_previous := v_item.action_status;
    if p_action = 'start' then
      if v_previous <> 'planned' then raise exception 'Only a planned action can be started' using errcode = '55000'; end if;
      v_next := 'in_progress';
    elsif p_action = 'complete' then
      if v_previous not in ('planned','in_progress') then raise exception 'Only an active action can be completed' using errcode = '55000'; end if;
      if length(coalesce(v_note,'')) < 5 then raise exception 'A completion note of at least five characters is required' using errcode = '22023'; end if;
      v_next := 'completed';
    elsif p_action = 'reopen' then
      if v_previous not in ('completed','cancelled') then raise exception 'Only a completed or cancelled action can be reopened' using errcode = '55000'; end if;
      v_next := 'in_progress';
    else
      if v_previous in ('completed','cancelled') then raise exception 'This action is already closed' using errcode = '55000'; end if;
      if length(coalesce(v_note,'')) < 5 then raise exception 'A cancellation reason is required' using errcode = '22023'; end if;
      v_next := 'cancelled';
    end if;
    update public.staff_task_investigation_corrective_actions
    set action_status = v_next,
        completion_note = case when v_next = 'completed' then v_note else null end,
        completed_at = case when v_next = 'completed' then now() else null end,
        updated_at = now()
    where id = v_item.id returning * into v_item;
  end if;

  insert into public.staff_task_investigation_corrective_action_history(
    clinic_id,task_id,alert_id,corrective_action_id,actor_user_id,actor_staff_profile_id,
    action_type,previous_status,resulting_status,action_note
  ) values (
    p_clinic_id,v_alert.task_id,v_alert.id,v_item.id,v_uid,v_actor_profile_id,
    case p_action when 'create' then 'created' when 'start' then 'started' when 'complete' then 'completed'
      when 'reopen' then 'reopened' else 'cancelled' end,
    v_previous,v_next,v_note
  ) returning id into v_history_id;

  return jsonb_build_object('success',true,'alert_id',p_alert_id,'corrective_action_id',v_item.id,
    'action_status',v_item.action_status,'history_id',v_history_id,'recorded_at',now());
end;
$function$;

revoke all on function public.manage_hospital_investigation_corrective_action(uuid,uuid,text,uuid,text,uuid,date,text) from public,anon;
grant execute on function public.manage_hospital_investigation_corrective_action(uuid,uuid,text,uuid,text,uuid,date,text) to authenticated;

create or replace function public.verify_hospital_investigation_alert_closure(
  p_clinic_id uuid,
  p_alert_id uuid,
  p_findings_summary text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_profile_id uuid;
  v_alert public.staff_task_evidence_file_tamper_alerts%rowtype;
  v_file public.staff_task_evidence_file_integrity%rowtype;
  v_latest_verification public.staff_task_evidence_file_verifications%rowtype;
  v_assigned_user_id uuid;
  v_action_count integer := 0;
  v_incomplete_count integer := 0;
  v_verification_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_alert_id is null then raise exception 'Hospital and alert are required' using errcode = '22023'; end if;
  if length(trim(coalesce(p_findings_summary,''))) < 10 or length(p_findings_summary) > 3000 then
    raise exception 'Provide an independent closure findings summary between 10 and 3,000 characters' using errcode = '22023';
  end if;

  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may verify investigation closure' using errcode = '42501';
  end if;

  select sp.id into v_profile_id from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid and sp.employment_status = 'active' limit 1;

  select a.* into v_alert from public.staff_task_evidence_file_tamper_alerts a
  where a.id = p_alert_id and a.clinic_id = p_clinic_id for update;
  if not found then raise exception 'Investigation alert not found' using errcode = 'P0002'; end if;
  if v_alert.alert_status = 'resolved' then raise exception 'This investigation alert is already resolved' using errcode = '55000'; end if;

  select f.* into v_file from public.staff_task_evidence_file_integrity f
  where f.clinic_id = p_clinic_id and f.task_id = v_alert.task_id and f.evidence_id = v_alert.evidence_id;
  if not found then raise exception 'Original evidence fingerprint is unavailable; closure is blocked' using errcode = '55000'; end if;

  select v.* into v_latest_verification from public.staff_task_evidence_file_verifications v
  where v.clinic_id = p_clinic_id and v.task_id = v_alert.task_id and v.evidence_id = v_alert.evidence_id
  order by v.verified_at desc,v.id desc limit 1;
  if not found or v_latest_verification.verification_result <> 'verified'
     or v_latest_verification.requested_by_user_id <> v_uid then
    raise exception 'Run a fresh successful actual-file verification as the independent closure verifier before closure approval' using errcode = '55000';
  end if;

  if v_uid = v_file.uploaded_by_user_id then
    raise exception 'The original evidence uploader cannot independently verify closure' using errcode = '42501';
  end if;

  select sp.user_id into v_assigned_user_id
  from public.staff_task_evidence_tamper_alert_actions x
  join public.staff_profiles sp on sp.id = x.assigned_to_staff_profile_id and sp.clinic_id = x.clinic_id
  where x.clinic_id = p_clinic_id and x.alert_id = p_alert_id
    and x.action_type = 'assigned' and x.assigned_to_staff_profile_id is not null
  order by x.created_at desc,x.id desc limit 1;

  if v_assigned_user_id is not null and v_assigned_user_id = v_uid then
    raise exception 'The assigned investigation officer cannot independently verify closure' using errcode = '42501';
  end if;

  select count(*)::integer,
    count(*) filter (where c.action_status <> 'completed')::integer
  into v_action_count,v_incomplete_count
  from public.staff_task_investigation_corrective_actions c
  where c.clinic_id = p_clinic_id and c.alert_id = p_alert_id;
  if v_action_count = 0 or v_incomplete_count > 0 then
    raise exception 'At least one corrective action must exist and every corrective action must be completed before independent closure verification' using errcode = '55000';
  end if;

  insert into public.staff_task_investigation_closure_verifications(
    clinic_id,task_id,alert_id,evidence_id,verified_by_user_id,verified_by_staff_profile_id,
    file_verification_id,verification_outcome,findings_summary,corrective_actions_reviewed
  ) values (
    p_clinic_id,v_alert.task_id,p_alert_id,v_alert.evidence_id,v_uid,v_profile_id,
    v_latest_verification.id,'accepted',trim(p_findings_summary),v_action_count
  ) returning id into v_verification_id;

  return jsonb_build_object('success',true,'verification_id',v_verification_id,
    'alert_id',p_alert_id,'verification_outcome','accepted','corrective_actions_reviewed',v_action_count,
    'verified_at',now(),'independent_verification',true);
end;
$function$;

revoke all on function public.verify_hospital_investigation_alert_closure(uuid,uuid,text) from public,anon;
grant execute on function public.verify_hospital_investigation_alert_closure(uuid,uuid,text) to authenticated;

-- Replace the Part 2S alert manager with an additional independent-closure gate.
create or replace function public.manage_hospital_investigation_tamper_alert(
  p_clinic_id uuid,
  p_alert_id uuid,
  p_action text,
  p_assigned_to_staff_profile_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_actor_profile_id uuid;
  v_alert public.staff_task_evidence_file_tamper_alerts%rowtype;
  v_previous_status text;
  v_new_status text;
  v_action_id uuid;
  v_note text := nullif(trim(coalesce(p_note,'')), '');
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_alert_id is null then raise exception 'Hospital and alert identifiers are required' using errcode = '22023'; end if;
  if p_action is null or p_action not in ('acknowledged','assigned','escalated','resolved','reopened','note_added') then
    raise exception 'Unsupported investigation alert action' using errcode = '22023';
  end if;
  if length(coalesce(v_note,'')) > 2000 then raise exception 'Investigation note cannot exceed 2,000 characters' using errcode = '22023'; end if;
  if p_action in ('escalated','resolved','reopened','note_added') and v_note is null then
    raise exception 'A reason or investigation note is required for this action' using errcode = '22023';
  end if;

  select cm.role into v_role from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active' limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may manage investigation alerts' using errcode = '42501';
  end if;

  select sp.id into v_actor_profile_id from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid and sp.employment_status = 'active' limit 1;

  select a.* into v_alert from public.staff_task_evidence_file_tamper_alerts a
  where a.id = p_alert_id and a.clinic_id = p_clinic_id for update;
  if not found then raise exception 'Investigation alert not found in this hospital' using errcode = 'P0002'; end if;

  v_previous_status := v_alert.alert_status;
  v_new_status := v_previous_status;

  if p_action = 'acknowledged' then
    if v_previous_status <> 'open' then raise exception 'Only an open alert can be acknowledged' using errcode = '55000'; end if;
    v_new_status := 'acknowledged';
  elsif p_action = 'assigned' then
    if v_previous_status = 'resolved' then raise exception 'A resolved alert cannot be assigned; reopen it first' using errcode = '55000'; end if;
    if p_assigned_to_staff_profile_id is null or not exists (
      select 1 from public.staff_profiles sp where sp.id = p_assigned_to_staff_profile_id
        and sp.clinic_id = p_clinic_id and sp.employment_status = 'active'
    ) then raise exception 'Choose an active staff member from this hospital' using errcode = '22023'; end if;
  elsif p_action = 'escalated' then
    if v_previous_status = 'resolved' then raise exception 'A resolved alert cannot be escalated; reopen it first' using errcode = '55000'; end if;
  elsif p_action = 'resolved' then
    if v_previous_status = 'resolved' then raise exception 'This alert is already resolved' using errcode = '55000'; end if;
    if not exists (
      select 1 from public.staff_task_investigation_closure_verifications cv
      where cv.clinic_id = p_clinic_id and cv.alert_id = p_alert_id
        and cv.verification_outcome = 'accepted' and cv.verified_by_user_id <> v_uid
    ) then
      raise exception 'Independent closure verification by a different administrator is required before resolution' using errcode = '55000';
    end if;
    if not exists (
      select 1 from public.staff_task_investigation_corrective_actions ca
      where ca.clinic_id = p_clinic_id and ca.alert_id = p_alert_id
    ) or exists (
      select 1 from public.staff_task_investigation_corrective_actions ca
      where ca.clinic_id = p_clinic_id and ca.alert_id = p_alert_id and ca.action_status <> 'completed'
    ) then
      raise exception 'All documented corrective actions must be completed before resolution' using errcode = '55000';
    end if;
    v_new_status := 'resolved';
  elsif p_action = 'reopened' then
    if v_previous_status <> 'resolved' then raise exception 'Only a resolved alert can be reopened' using errcode = '55000'; end if;
    v_new_status := 'open';
  end if;

  if v_new_status is distinct from v_previous_status then
    update public.staff_task_evidence_file_tamper_alerts set alert_status = v_new_status
    where id = p_alert_id and clinic_id = p_clinic_id;
  end if;

  insert into public.staff_task_evidence_tamper_alert_actions(
    clinic_id,task_id,alert_id,actor_user_id,actor_staff_profile_id,action_type,
    assigned_to_staff_profile_id,previous_alert_status,resulting_alert_status,action_note
  ) values (
    p_clinic_id,v_alert.task_id,v_alert.id,v_uid,v_actor_profile_id,p_action,
    case when p_action = 'assigned' then p_assigned_to_staff_profile_id else null end,
    v_previous_status,v_new_status,v_note
  ) returning id into v_action_id;

  return jsonb_build_object('success',true,'alert_id',p_alert_id,'action_id',v_action_id,
    'action',p_action,'previous_status',v_previous_status,'alert_status',v_new_status,'recorded_at',now());
end;
$function$;

revoke all on function public.manage_hospital_investigation_tamper_alert(uuid,uuid,text,uuid,text) from public,anon;
grant execute on function public.manage_hospital_investigation_tamper_alert(uuid,uuid,text,uuid,text) to authenticated;

comment on table public.staff_task_investigation_corrective_actions is
'Tracked hospital investigation corrective actions with accountable assignee, status, due date and completion note.';
comment on table public.staff_task_investigation_corrective_action_history is
'Append-only history of corrective-action creation and status transitions.';
comment on table public.staff_task_investigation_closure_verifications is
'Append-only independent investigation closure verification, requiring fresh actual-file verification, completed corrective actions, and a verifier distinct from the original uploader and assigned investigator.';
