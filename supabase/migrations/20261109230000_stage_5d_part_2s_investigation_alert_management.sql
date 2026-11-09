-- Stage 5D Part 2S: Investigation alert management and administrator inbox.
-- Additive to Parts 2P/2Q/2R. Does not change clinical, billing, pharmacy,
-- task execution, existing evidence, or evidence-verification workflows.
-- Notifications in this part are in-app administrator inbox entries, refreshed on demand
-- and while the inbox is open. No email/SMS/push provider is assumed.

create table if not exists public.staff_task_evidence_tamper_alert_actions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  task_id uuid not null,
  alert_id uuid not null references public.staff_task_evidence_file_tamper_alerts(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  action_type text not null check (action_type in (
    'acknowledged','assigned','escalated','resolved','reopened','note_added'
  )),
  assigned_to_staff_profile_id uuid references public.staff_profiles(id) on delete restrict,
  previous_alert_status text not null check (previous_alert_status in ('open','acknowledged','resolved')),
  resulting_alert_status text not null check (resulting_alert_status in ('open','acknowledged','resolved')),
  action_note text,
  created_at timestamptz not null default now(),
  constraint staff_task_evidence_tamper_alert_actions_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete restrict
);

create index if not exists staff_task_evidence_tamper_alert_actions_alert_idx
  on public.staff_task_evidence_tamper_alert_actions(clinic_id, alert_id, created_at desc);

create index if not exists staff_task_evidence_tamper_alert_actions_assignee_idx
  on public.staff_task_evidence_tamper_alert_actions(clinic_id, assigned_to_staff_profile_id, created_at desc)
  where assigned_to_staff_profile_id is not null;

alter table public.staff_task_evidence_tamper_alert_actions enable row level security;
revoke all on public.staff_task_evidence_tamper_alert_actions from public, anon, authenticated;
grant all on public.staff_task_evidence_tamper_alert_actions to service_role;

create or replace function public.prevent_staff_task_evidence_tamper_alert_action_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Investigation alert action history is append-only.'
    using errcode = '55000';
end;
$function$;

drop trigger if exists staff_task_evidence_tamper_alert_actions_append_only
  on public.staff_task_evidence_tamper_alert_actions;
create trigger staff_task_evidence_tamper_alert_actions_append_only
before update or delete on public.staff_task_evidence_tamper_alert_actions
for each row execute function public.prevent_staff_task_evidence_tamper_alert_action_mutation();

create or replace function public.get_hospital_investigation_tamper_alert_inbox(
  p_clinic_id uuid,
  p_limit integer default 100
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
  v_alerts jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_open integer := 0;
  v_acknowledged integer := 0;
  v_resolved integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null then
    raise exception 'Hospital clinic is required' using errcode = '22023';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id
    and cm.user_id = v_uid
    and cm.status = 'active'
  limit 1;

  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may access the investigation alert inbox'
      using errcode = '42501';
  end if;

  select count(*)::integer,
    count(*) filter (where a.alert_status = 'open')::integer,
    count(*) filter (where a.alert_status = 'acknowledged')::integer,
    count(*) filter (where a.alert_status = 'resolved')::integer
  into v_total, v_open, v_acknowledged, v_resolved
  from public.staff_task_evidence_file_tamper_alerts a
  where a.clinic_id = p_clinic_id;

  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb)
  into v_alerts
  from (
    select
      a.created_at,
      jsonb_build_object(
        'alert_id', a.id,
        'clinic_id', a.clinic_id,
        'task_id', a.task_id,
        'evidence_id', a.evidence_id,
        'alert_type', a.alert_type,
        'severity', a.severity,
        'alert_status', a.alert_status,
        'created_at', a.created_at,
        'file_name', f.original_file_name,
        'mime_type', f.mime_type,
        'byte_size', f.byte_size,
        'latest_action', latest.action_type,
        'latest_action_note', latest.action_note,
        'latest_action_at', latest.created_at,
        'latest_actor_name', actor.full_name,
        'assigned_to_staff_profile_id', assigned_action.assigned_to_staff_profile_id,
        'assigned_to_name', assignee.full_name,
        'assigned_at', assigned_action.created_at
      ) as row_data
    from public.staff_task_evidence_file_tamper_alerts a
    left join public.staff_task_evidence_file_integrity f
      on f.clinic_id = a.clinic_id
     and f.task_id = a.task_id
     and f.evidence_id = a.evidence_id
    left join lateral (
      select x.action_type, x.action_note, x.actor_staff_profile_id, x.created_at
      from public.staff_task_evidence_tamper_alert_actions x
      where x.clinic_id = a.clinic_id and x.alert_id = a.id
      order by x.created_at desc, x.id desc
      limit 1
    ) latest on true
    left join public.staff_profiles actor
      on actor.id = latest.actor_staff_profile_id and actor.clinic_id = a.clinic_id
    left join lateral (
      select x.assigned_to_staff_profile_id, x.created_at
      from public.staff_task_evidence_tamper_alert_actions x
      where x.clinic_id = a.clinic_id
        and x.alert_id = a.id
        and x.action_type = 'assigned'
        and x.assigned_to_staff_profile_id is not null
      order by x.created_at desc, x.id desc
      limit 1
    ) assigned_action on true
    left join public.staff_profiles assignee
      on assignee.id = assigned_action.assigned_to_staff_profile_id
     and assignee.clinic_id = a.clinic_id
    where a.clinic_id = p_clinic_id
    order by a.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 250))
  ) inbox_rows;

  return jsonb_build_object(
    'read_only', true,
    'clinic_id', p_clinic_id,
    'generated_at', now(),
    'summary', jsonb_build_object(
      'total_alerts', v_total,
      'open_alerts', v_open,
      'acknowledged_alerts', v_acknowledged,
      'resolved_alerts', v_resolved
    ),
    'alerts', v_alerts,
    'notification_channel', 'in_app_administrator_inbox'
  );
end;
$function$;

revoke all on function public.get_hospital_investigation_tamper_alert_inbox(uuid,integer)
  from public, anon;
grant execute on function public.get_hospital_investigation_tamper_alert_inbox(uuid,integer)
  to authenticated;

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
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_alert_id is null then
    raise exception 'Hospital and alert identifiers are required' using errcode = '22023';
  end if;
  if p_action is null or p_action not in ('acknowledged','assigned','escalated','resolved','reopened','note_added') then
    raise exception 'Unsupported investigation alert action' using errcode = '22023';
  end if;
  if length(coalesce(v_note,'')) > 2000 then
    raise exception 'Investigation note cannot exceed 2,000 characters' using errcode = '22023';
  end if;
  if p_action in ('escalated','resolved','reopened','note_added') and v_note is null then
    raise exception 'A reason or investigation note is required for this action' using errcode = '22023';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id
    and cm.user_id = v_uid
    and cm.status = 'active'
  limit 1;
  if v_role is null or v_role not in ('owner','admin') then
    raise exception 'Only active hospital owners and administrators may manage investigation alerts'
      using errcode = '42501';
  end if;

  select sp.id into v_actor_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id
    and sp.user_id = v_uid
    and sp.employment_status = 'active'
  limit 1;

  select a.* into v_alert
  from public.staff_task_evidence_file_tamper_alerts a
  where a.id = p_alert_id and a.clinic_id = p_clinic_id
  for update;
  if not found then
    raise exception 'Investigation alert not found in this hospital' using errcode = 'P0002';
  end if;

  v_previous_status := v_alert.alert_status;
  v_new_status := v_previous_status;

  if p_action = 'acknowledged' then
    if v_previous_status <> 'open' then
      raise exception 'Only an open alert can be acknowledged' using errcode = '55000';
    end if;
    v_new_status := 'acknowledged';
  elsif p_action = 'assigned' then
    if v_previous_status = 'resolved' then
      raise exception 'A resolved alert cannot be assigned; reopen it first' using errcode = '55000';
    end if;
    if p_assigned_to_staff_profile_id is null or not exists (
      select 1 from public.staff_profiles sp
      where sp.id = p_assigned_to_staff_profile_id
        and sp.clinic_id = p_clinic_id
        and sp.employment_status = 'active'
    ) then
      raise exception 'Choose an active staff member from this hospital' using errcode = '22023';
    end if;
  elsif p_action = 'escalated' then
    if v_previous_status = 'resolved' then
      raise exception 'A resolved alert cannot be escalated; reopen it first' using errcode = '55000';
    end if;
  elsif p_action = 'resolved' then
    if v_previous_status = 'resolved' then
      raise exception 'This alert is already resolved' using errcode = '55000';
    end if;
    v_new_status := 'resolved';
  elsif p_action = 'reopened' then
    if v_previous_status <> 'resolved' then
      raise exception 'Only a resolved alert can be reopened' using errcode = '55000';
    end if;
    v_new_status := 'open';
  end if;

  if v_new_status is distinct from v_previous_status then
    update public.staff_task_evidence_file_tamper_alerts
    set alert_status = v_new_status
    where id = p_alert_id and clinic_id = p_clinic_id;
  end if;

  insert into public.staff_task_evidence_tamper_alert_actions (
    clinic_id, task_id, alert_id, actor_user_id, actor_staff_profile_id,
    action_type, assigned_to_staff_profile_id,
    previous_alert_status, resulting_alert_status, action_note
  ) values (
    p_clinic_id, v_alert.task_id, v_alert.id, v_uid, v_actor_profile_id,
    p_action, case when p_action = 'assigned' then p_assigned_to_staff_profile_id else null end,
    v_previous_status, v_new_status, v_note
  )
  returning id into v_action_id;

  return jsonb_build_object(
    'success', true,
    'alert_id', p_alert_id,
    'action_id', v_action_id,
    'action', p_action,
    'previous_status', v_previous_status,
    'alert_status', v_new_status,
    'recorded_at', now()
  );
end;
$function$;

revoke all on function public.manage_hospital_investigation_tamper_alert(uuid,uuid,text,uuid,text)
  from public, anon;
grant execute on function public.manage_hospital_investigation_tamper_alert(uuid,uuid,text,uuid,text)
  to authenticated;

comment on table public.staff_task_evidence_tamper_alert_actions is
'Append-only hospital administrator action history for investigation evidence tamper alerts. Alert status transitions are recorded with actor, prior/resulting status, optional assignee and reason.';
comment on function public.get_hospital_investigation_tamper_alert_inbox(uuid,integer) is
'Read-only hospital-scoped in-app investigation tamper alert inbox for active owners and administrators. Does not expose storage paths or cryptographic hashes.';
comment on function public.manage_hospital_investigation_tamper_alert(uuid,uuid,text,uuid,text) is
'Owner/admin-only alert acknowledgement, assignment, escalation, resolution, reopening and note workflow. Every action is appended to an immutable action ledger.';
