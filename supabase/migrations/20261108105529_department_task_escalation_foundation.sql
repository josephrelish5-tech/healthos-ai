-- Stage 3I-A: secure department task escalation records and authorised RPCs.
-- Additive only: preserves existing task statuses, priorities and workspace RPCs.

create table if not exists public.department_task_escalations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  task_id uuid not null,
  department_id uuid not null,
  unit_id uuid,
  escalation_level smallint not null default 1 check (escalation_level between 1 and 3),
  severity text not null default 'high'
    check (severity in ('normal','high','urgent','critical')),
  source text not null default 'manual'
    check (source in ('manual','blocked','overdue','system')),
  status text not null default 'open'
    check (status in ('open','acknowledged','resolved','dismissed')),
  reason text not null check (length(btrim(reason)) between 5 and 2000),
  raised_by_user_id uuid not null,
  raised_by_staff_profile_id uuid,
  acknowledged_by_user_id uuid,
  acknowledged_at timestamptz,
  resolved_by_user_id uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint department_task_escalations_task_tenant_fk
    foreign key (task_id, clinic_id)
    references public.staff_tasks(id, clinic_id) on delete cascade,
  constraint department_task_escalations_department_tenant_fk
    foreign key (department_id, clinic_id)
    references public.clinic_departments(id, clinic_id) on delete restrict,
  constraint department_task_escalations_unit_tenant_fk
    foreign key (unit_id, clinic_id)
    references public.clinic_units(id, clinic_id) on delete restrict,
  constraint department_task_escalations_staff_tenant_fk
    foreign key (raised_by_staff_profile_id, clinic_id)
    references public.staff_profiles(id, clinic_id) on delete restrict,
  constraint department_task_escalations_id_clinic_unique unique (id, clinic_id),
  constraint department_task_escalations_resolution_check
    check (
      (status <> 'resolved' or (resolved_at is not null and resolved_by_user_id is not null))
      and (status <> 'acknowledged' or (acknowledged_at is not null and acknowledged_by_user_id is not null))
      and (resolution_notes is null or length(resolution_notes) <= 2000)
    )
);

create table if not exists public.department_task_escalation_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  escalation_id uuid not null,
  actor_user_id uuid not null,
  action_key text not null
    check (action_key in ('raised','acknowledged','resolved','dismissed','reopened','reassigned','note_added')),
  event_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint department_task_escalation_events_escalation_tenant_fk
    foreign key (escalation_id, clinic_id)
    references public.department_task_escalations(id, clinic_id) on delete cascade,
  constraint department_task_escalation_events_notes_check
    check (event_notes is null or length(event_notes) <= 2000)
);

create index if not exists department_task_escalations_queue_idx
  on public.department_task_escalations
  (clinic_id, department_id, status, severity, created_at desc);
create index if not exists department_task_escalations_task_idx
  on public.department_task_escalations (clinic_id, task_id, created_at desc);
create index if not exists department_task_escalation_events_history_idx
  on public.department_task_escalation_events (clinic_id, escalation_id, created_at desc);

alter table public.department_task_escalations enable row level security;
alter table public.department_task_escalation_events enable row level security;
revoke all on public.department_task_escalations from public, anon, authenticated;
revoke all on public.department_task_escalation_events from public, anon, authenticated;

create or replace function public.raise_department_task_escalation(
  p_clinic_id uuid,
  p_task_id uuid,
  p_reason text,
  p_severity text default 'high'
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
  v_allowed boolean := false;
  v_escalation_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_task_id is null then
    raise exception 'Clinic and task are required' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 2000 then
    raise exception 'Escalation reason must be between 5 and 2000 characters' using errcode = '22023';
  end if;
  if p_severity not in ('normal','high','urgent','critical') then
    raise exception 'Invalid escalation severity' using errcode = '22023';
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

  select * into v_task
  from public.staff_tasks t
  where t.id = p_task_id and t.clinic_id = p_clinic_id
  for update;
  if not found then
    raise exception 'Task not found in this hospital' using errcode = 'P0002';
  end if;
  if v_task.task_status in ('completed','cancelled') then
    raise exception 'Closed tasks cannot receive a new escalation' using errcode = '22023';
  end if;

  v_allowed := v_role in ('owner','admin')
    or exists (
      select 1
      from public.staff_department_assignments a
      where a.id = v_task.assigned_to_assignment_id
        and a.clinic_id = p_clinic_id
        and a.staff_profile_id = v_profile_id
    )
    or exists (
      select 1
      from public.staff_department_assignments a
      where a.id = v_task.assigned_to_assignment_id
        and a.clinic_id = p_clinic_id
        and a.supervisor_staff_profile_id = v_profile_id
    )
    or exists (
      select 1
      from public.clinic_management_assignments m
      join public.staff_department_assignments ma
        on ma.id = m.manager_assignment_id and ma.clinic_id = m.clinic_id
      where m.clinic_id = p_clinic_id
        and ma.staff_profile_id = v_profile_id
        and m.department_id = v_task.department_id
        and (m.unit_id is null or m.unit_id = v_task.unit_id)
        and m.assignment_status in ('active','delegated')
        and m.effective_from <= current_date
        and (m.effective_to is null or m.effective_to >= current_date)
    );

  if not v_allowed then
    raise exception 'You are not authorised to escalate this department task' using errcode = '42501';
  end if;

  insert into public.department_task_escalations (
    clinic_id, task_id, department_id, unit_id, severity, source,
    reason, raised_by_user_id, raised_by_staff_profile_id
  )
  values (
    p_clinic_id, p_task_id, v_task.department_id, v_task.unit_id,
    p_severity, case when v_task.task_status = 'blocked' then 'blocked' else 'manual' end,
    btrim(p_reason), v_uid, v_profile_id
  )
  returning id into v_escalation_id;

  insert into public.department_task_escalation_events (
    clinic_id, escalation_id, actor_user_id, action_key, event_notes, metadata
  )
  values (
    p_clinic_id, v_escalation_id, v_uid, 'raised', btrim(p_reason),
    jsonb_build_object('task_id', p_task_id, 'severity', p_severity, 'source', case when v_task.task_status = 'blocked' then 'blocked' else 'manual' end)
  );

  insert into public.staff_task_events (
    clinic_id, task_id, actor_staff_profile_id, event_type, event_notes, metadata
  )
  values (
    p_clinic_id, p_task_id, v_profile_id, 'escalated',
    'Task escalation raised',
    jsonb_build_object('escalation_id', v_escalation_id, 'severity', p_severity)
  );

  return jsonb_build_object(
    'success', true,
    'escalation_id', v_escalation_id,
    'task_id', p_task_id,
    'status', 'open',
    'severity', p_severity,
    'created_at', now()
  );
end;
$function$;

revoke all on function public.raise_department_task_escalation(uuid,uuid,text,text)
  from public, anon;
grant execute on function public.raise_department_task_escalation(uuid,uuid,text,text)
  to authenticated;

create or replace function public.get_department_task_escalations(
  p_clinic_id uuid,
  p_department_id uuid,
  p_status text default null,
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
  v_is_admin boolean := false;
  v_items jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_department_id is null then
    raise exception 'Clinic and department are required' using errcode = '22023';
  end if;
  if p_status is not null and p_status not in ('open','acknowledged','resolved','dismissed') then
    raise exception 'Invalid escalation status filter' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'Escalation queue limit must be between 1 and 200' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid
      and cm.status = 'active' and cm.role in ('owner','admin')
  ) into v_is_admin;

  if not v_is_admin and not exists (
    select 1
    from public.clinic_memberships cm
    join public.staff_profiles sp
      on sp.clinic_id = cm.clinic_id and sp.user_id = cm.user_id
      and sp.employment_status = 'active'
    join public.staff_department_assignments a
      on a.clinic_id = sp.clinic_id and a.staff_profile_id = sp.id
      and a.assignment_status = 'active'
      and a.effective_from <= current_date
      and (a.effective_to is null or a.effective_to >= current_date)
    join public.clinic_management_assignments m
      on m.clinic_id = a.clinic_id and m.manager_assignment_id = a.id
      and m.department_id = p_department_id
      and m.assignment_status in ('active','delegated')
      and m.effective_from <= current_date
      and (m.effective_to is null or m.effective_to >= current_date)
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid
      and cm.status = 'active'
  ) then
    raise exception 'Hospital administrator or appointed department manager access required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.clinic_departments d
    where d.id = p_department_id and d.clinic_id = p_clinic_id and d.is_active
  ) then
    raise exception 'Active department not found' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(item order by
    case item->>'severity' when 'critical' then 1 when 'urgent' then 2 when 'high' then 3 else 4 end,
    (item->>'created_at')::timestamptz desc
  ), '[]'::jsonb)
  into v_items
  from (
    select jsonb_build_object(
      'id', e.id, 'task_id', e.task_id, 'department_id', e.department_id,
      'unit_id', e.unit_id, 'task_title', t.task_title, 'task_status', t.task_status,
      'task_due_at', t.due_at, 'severity', e.severity, 'source', e.source,
      'escalation_level', e.escalation_level, 'status', e.status,
      'reason', e.reason, 'raised_by_user_id', e.raised_by_user_id,
      'raised_by_name', raiser.full_name, 'created_at', e.created_at,
      'acknowledged_at', e.acknowledged_at, 'resolved_at', e.resolved_at,
      'resolution_notes', e.resolution_notes
    ) as item
    from public.department_task_escalations e
    join public.staff_tasks t
      on t.id = e.task_id and t.clinic_id = e.clinic_id
    left join public.staff_profiles raiser
      on raiser.id = e.raised_by_staff_profile_id and raiser.clinic_id = e.clinic_id
    where e.clinic_id = p_clinic_id
      and e.department_id = p_department_id
      and (p_status is null or e.status = p_status)
    order by e.created_at desc
    limit p_limit
  ) q;

  return jsonb_build_object(
    'clinic_id', p_clinic_id,
    'department_id', p_department_id,
    'scope', case when v_is_admin then 'hospital_wide_admin' else 'appointed_department_manager' end,
    'escalations', coalesce(v_items, '[]'::jsonb),
    'generated_at', now(),
    'limit', p_limit
  );
end;
$function$;

revoke all on function public.get_department_task_escalations(uuid,uuid,text,integer)
  from public, anon;
grant execute on function public.get_department_task_escalations(uuid,uuid,text,integer)
  to authenticated;

comment on table public.department_task_escalations is
  'Clinic-scoped department task escalations. Direct table access is revoked; use authorised RPCs.';
comment on table public.department_task_escalation_events is
  'Append-only audit history for department task escalation actions. Direct table access is revoked.';
