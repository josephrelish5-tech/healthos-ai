-- Stage 5D Part 2J: append-only escalation follow-up and resolution tracking.
-- Records acknowledgement, investigation, authorised corrective action, evidence-backed resolution,
-- independent verification and reopening. Existing task/review records are not modified.

create table if not exists public.staff_task_escalation_actions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  department_id uuid not null,
  task_id uuid not null,
  cycle_no integer not null default 1 check (cycle_no > 0),
  action_type text not null check (action_type in (
    'acknowledged',
    'investigation_started',
    'corrective_action_authorized',
    'resolution_submitted',
    'resolution_verified',
    'reopened'
  )),
  actor_user_id uuid not null,
  actor_staff_profile_id uuid,
  action_notes text not null,
  evidence_reference text,
  created_at timestamptz not null default now(),
  constraint staff_task_escalation_actions_task_fk
    foreign key (task_id) references public.staff_tasks(id) on delete restrict
);

create index if not exists staff_task_escalation_actions_scope_idx
  on public.staff_task_escalation_actions(clinic_id, department_id, task_id, cycle_no, created_at);

alter table public.staff_task_escalation_actions enable row level security;
revoke all on table public.staff_task_escalation_actions from public, anon, authenticated;

create or replace function public.prevent_escalation_action_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Escalation follow-up history is append-only; updates and deletes are prohibited'
    using errcode = '42501';
end;
$function$;

revoke all on function public.prevent_escalation_action_mutation() from public, anon, authenticated;

drop trigger if exists staff_task_escalation_actions_append_only on public.staff_task_escalation_actions;
create trigger staff_task_escalation_actions_append_only
before update or delete on public.staff_task_escalation_actions
for each row execute function public.prevent_escalation_action_mutation();

create or replace function public.record_department_task_escalation_action(
  p_clinic_id uuid,
  p_department_id uuid,
  p_task_id uuid,
  p_action_type text,
  p_action_notes text,
  p_evidence_reference text default null
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
  v_task public.staff_tasks%rowtype;
  v_cycle integer;
  v_last_action text;
  v_inserted_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_department_id is null or p_task_id is null then
    raise exception 'Clinic, department and task are required' using errcode = '22023';
  end if;
  if p_action_type not in (
    'acknowledged','investigation_started','corrective_action_authorized',
    'resolution_submitted','resolution_verified','reopened'
  ) then
    raise exception 'Unsupported escalation action' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_action_notes,'')),'') is null then
    raise exception 'A meaningful action note is required' using errcode = '22023';
  end if;
  if length(p_action_notes) > 4000 or length(coalesce(p_evidence_reference,'')) > 1000 then
    raise exception 'Action notes or evidence reference exceed the allowed length' using errcode = '22023';
  end if;
  if p_action_type = 'resolution_submitted'
     and nullif(trim(coalesce(p_evidence_reference,'')),'') is null then
    raise exception 'Resolution submission requires an evidence reference' using errcode = '22023';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id
    and cm.user_id = v_uid
    and cm.status = 'active'
  limit 1;
  if v_role is null then
    raise exception 'Active hospital membership required' using errcode = '42501';
  end if;

  select sp.id into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id
    and sp.user_id = v_uid
    and sp.employment_status = 'active'
  limit 1;

  if v_role not in ('owner','admin') and not exists (
    select 1
    from public.staff_department_assignments sda
    join public.clinic_management_assignments ma
      on ma.clinic_id = sda.clinic_id
     and ma.manager_assignment_id = sda.id
    where sda.clinic_id = p_clinic_id
      and sda.staff_profile_id = v_profile_id
      and sda.assignment_status = 'active'
      and sda.effective_from <= current_date
      and (sda.effective_to is null or sda.effective_to >= current_date)
      and ma.department_id = p_department_id
      and ma.assignment_status in ('active','delegated')
      and ma.effective_from <= current_date
      and (ma.effective_to is null or ma.effective_to >= current_date)
  ) then
    raise exception 'Appointed department management access required' using errcode = '42501';
  end if;

  select t.* into v_task
  from public.staff_tasks t
  where t.id = p_task_id
    and t.clinic_id = p_clinic_id
    and t.department_id = p_department_id;
  if not found then
    raise exception 'Task not found in the authorised department' using errcode = 'P0002';
  end if;

  select coalesce(max(a.cycle_no),1), (array_agg(a.action_type order by a.cycle_no desc, a.created_at desc))[1]
    into v_cycle, v_last_action
  from public.staff_task_escalation_actions a
  where a.clinic_id = p_clinic_id
    and a.department_id = p_department_id
    and a.task_id = p_task_id;

  if p_action_type = 'reopened' then
    if not exists (
      select 1 from public.staff_task_escalation_actions a
      where a.clinic_id = p_clinic_id and a.department_id = p_department_id
        and a.task_id = p_task_id and a.cycle_no = v_cycle
        and a.action_type = 'resolution_verified'
    ) then
      raise exception 'Only an independently verified resolution can be reopened' using errcode = '23514';
    end if;
  elsif v_last_action = 'reopened' then
    v_cycle := v_cycle + 1;
  end if;

  if p_action_type = 'acknowledged' then
    if exists (select 1 from public.staff_task_escalation_actions a
      where a.clinic_id=p_clinic_id and a.task_id=p_task_id and a.cycle_no=v_cycle
        and a.action_type='acknowledged') then
      raise exception 'This escalation cycle has already been acknowledged' using errcode = '23505';
    end if;
  elsif p_action_type = 'investigation_started' then
    if not exists (select 1 from public.staff_task_escalation_actions a
      where a.clinic_id=p_clinic_id and a.task_id=p_task_id and a.cycle_no=v_cycle
        and a.action_type='acknowledged') then
      raise exception 'Acknowledge the escalation before starting an investigation' using errcode = '23514';
    end if;
  elsif p_action_type = 'corrective_action_authorized' then
    if not exists (select 1 from public.staff_task_escalation_actions a
      where a.clinic_id=p_clinic_id and a.task_id=p_task_id and a.cycle_no=v_cycle
        and a.action_type='investigation_started') then
      raise exception 'An investigation must be recorded before authorising corrective action' using errcode = '23514';
    end if;
  elsif p_action_type = 'resolution_submitted' then
    if not exists (select 1 from public.staff_task_escalation_actions a
      where a.clinic_id=p_clinic_id and a.task_id=p_task_id and a.cycle_no=v_cycle
        and a.action_type='corrective_action_authorized') then
      raise exception 'Corrective action must be authorised before resolution is submitted' using errcode = '23514';
    end if;
  elsif p_action_type = 'resolution_verified' then
    if not exists (
      select 1 from public.staff_task_escalation_actions a
      where a.clinic_id=p_clinic_id and a.task_id=p_task_id and a.cycle_no=v_cycle
        and a.action_type='resolution_submitted'
        and a.actor_user_id <> v_uid
    ) then
      raise exception 'An independent reviewer must verify a resolution submitted by another person' using errcode = '23514';
    end if;
  end if;

  if exists (
    select 1 from public.staff_task_escalation_actions a
    where a.clinic_id=p_clinic_id and a.task_id=p_task_id and a.cycle_no=v_cycle
      and a.action_type=p_action_type
  ) and p_action_type <> 'reopened' then
    raise exception 'This action has already been recorded in the current escalation cycle' using errcode = '23505';
  end if;

  insert into public.staff_task_escalation_actions(
    clinic_id, department_id, task_id, cycle_no, action_type,
    actor_user_id, actor_staff_profile_id, action_notes, evidence_reference
  ) values (
    p_clinic_id, p_department_id, p_task_id, v_cycle, p_action_type,
    v_uid, v_profile_id, trim(p_action_notes), nullif(trim(coalesce(p_evidence_reference,'')),'')
  ) returning id into v_inserted_id;

  return jsonb_build_object(
    'success', true,
    'read_only_history', false,
    'action_id', v_inserted_id,
    'cycle_no', v_cycle,
    'action_type', p_action_type,
    'actor_staff_profile_id', v_profile_id,
    'recorded_at', now()
  );
end;
$function$;

revoke all on function public.record_department_task_escalation_action(uuid,uuid,uuid,text,text,text) from public, anon;
grant execute on function public.record_department_task_escalation_action(uuid,uuid,uuid,text,text,text) to authenticated;

create or replace function public.get_department_task_escalation_followups(
  p_clinic_id uuid,
  p_department_id uuid,
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
  v_history jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id=p_clinic_id and cm.user_id=v_uid and cm.status='active'
  limit 1;
  if v_role is null then
    raise exception 'Active hospital membership required' using errcode = '42501';
  end if;

  select sp.id into v_profile_id
  from public.staff_profiles sp
  where sp.clinic_id=p_clinic_id and sp.user_id=v_uid and sp.employment_status='active'
  limit 1;

  if v_role not in ('owner','admin') and not exists (
    select 1
    from public.staff_department_assignments sda
    join public.clinic_management_assignments ma
      on ma.clinic_id=sda.clinic_id and ma.manager_assignment_id=sda.id
    where sda.clinic_id=p_clinic_id and sda.staff_profile_id=v_profile_id
      and sda.assignment_status='active'
      and sda.effective_from<=current_date
      and (sda.effective_to is null or sda.effective_to>=current_date)
      and ma.department_id=p_department_id
      and ma.assignment_status in ('active','delegated')
      and ma.effective_from<=current_date
      and (ma.effective_to is null or ma.effective_to>=current_date)
  ) then
    raise exception 'Appointed department management access required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.staff_tasks t
    where t.id=p_task_id and t.clinic_id=p_clinic_id and t.department_id=p_department_id
  ) then
    raise exception 'Task not found in the authorised department' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'action_id', a.id,
    'cycle_no', a.cycle_no,
    'action_type', a.action_type,
    'actor_user_id', a.actor_user_id,
    'actor_staff_profile_id', a.actor_staff_profile_id,
    'actor_name', sp.full_name,
    'action_notes', a.action_notes,
    'evidence_reference', a.evidence_reference,
    'created_at', a.created_at
  ) order by a.cycle_no, a.created_at, a.id), '[]'::jsonb)
  into v_history
  from public.staff_task_escalation_actions a
  left join public.staff_profiles sp
    on sp.id=a.actor_staff_profile_id and sp.clinic_id=a.clinic_id
  where a.clinic_id=p_clinic_id
    and a.department_id=p_department_id
    and a.task_id=p_task_id;

  return jsonb_build_object(
    'read_only', true,
    'scope', 'appointed_department_or_hospital_admin',
    'clinic_id', p_clinic_id,
    'department_id', p_department_id,
    'task_id', p_task_id,
    'history', v_history
  );
end;
$function$;

revoke all on function public.get_department_task_escalation_followups(uuid,uuid,uuid) from public, anon;
grant execute on function public.get_department_task_escalation_followups(uuid,uuid,uuid) to authenticated;
