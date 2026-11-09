-- Stage 4D: linked hospital incident accountability workflow.
-- Additive only: preserves immutable hospital_incident_reports intake rows.
-- Feature branch only. Review and test before any production migration.

create unique index if not exists hospital_incident_reports_id_clinic_unique
  on public.hospital_incident_reports (id, clinic_id);

create table if not exists public.hospital_incident_workflows (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  incident_report_id uuid not null,
  department_id uuid,
  assigned_staff_profile_id uuid,
  assigned_by_user_id uuid,
  workflow_status text not null default 'triage_pending'
    check (workflow_status in ('triage_pending','assigned','acknowledged','response_in_progress','resolved','closed')),
  acknowledged_by_user_id uuid,
  acknowledged_at timestamptz,
  response_due_at timestamptz,
  response_summary text,
  resolution_notes text,
  resolution_evidence_reference text,
  resolved_by_user_id uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hospital_incident_workflow_one_per_report unique (clinic_id, incident_report_id),
  constraint hospital_incident_workflows_id_clinic_unique unique (id, clinic_id),
  constraint hospital_incident_workflow_report_tenant_fk
    foreign key (incident_report_id, clinic_id)
    references public.hospital_incident_reports(id, clinic_id) on delete restrict,
  constraint hospital_incident_workflow_department_tenant_fk
    foreign key (department_id, clinic_id)
    references public.clinic_departments(id, clinic_id),
  constraint hospital_incident_workflow_staff_tenant_fk
    foreign key (assigned_staff_profile_id, clinic_id)
    references public.staff_profiles(id, clinic_id)
);

create index if not exists hospital_incident_workflows_queue_idx
  on public.hospital_incident_workflows (clinic_id, workflow_status, response_due_at);

create table if not exists public.hospital_incident_workflow_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  workflow_id uuid not null,
  actor_user_id uuid,
  event_type text not null check (event_type in (
    'report_received','assigned','reassigned','acknowledged',
    'response_recorded','resolved','reopened','note_added'
  )),
  event_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint hospital_incident_workflow_events_workflow_tenant_fk
    foreign key (workflow_id, clinic_id)
    references public.hospital_incident_workflows(id, clinic_id) on delete restrict
);

create index if not exists hospital_incident_workflow_events_timeline_idx
  on public.hospital_incident_workflow_events (clinic_id, workflow_id, created_at);

alter table public.hospital_incident_workflows enable row level security;
alter table public.hospital_incident_workflow_events enable row level security;

drop policy if exists hospital_incident_workflows_admin_read on public.hospital_incident_workflows;
create policy hospital_incident_workflows_admin_read
on public.hospital_incident_workflows for select to authenticated
using (
  exists (select 1 from public.clinics c where c.id = clinic_id and c.owner_user_id = auth.uid())
  or exists (select 1 from public.clinic_memberships m
    where m.clinic_id = hospital_incident_workflows.clinic_id
      and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin'))
);

drop policy if exists hospital_incident_workflow_events_admin_read on public.hospital_incident_workflow_events;
create policy hospital_incident_workflow_events_admin_read
on public.hospital_incident_workflow_events for select to authenticated
using (
  exists (select 1 from public.clinics c where c.id = clinic_id and c.owner_user_id = auth.uid())
  or exists (select 1 from public.clinic_memberships m
    where m.clinic_id = hospital_incident_workflow_events.clinic_id
      and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin'))
);

revoke all on public.hospital_incident_workflows from anon, authenticated;
revoke all on public.hospital_incident_workflow_events from anon, authenticated;
grant select on public.hospital_incident_workflows, public.hospital_incident_workflow_events to authenticated;

create or replace function public.create_hospital_incident_workflow_on_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_workflow_id uuid;
begin
  insert into public.hospital_incident_workflows (clinic_id, incident_report_id)
  values (new.clinic_id, new.id)
  on conflict (clinic_id, incident_report_id) do nothing
  returning id into v_workflow_id;

  if v_workflow_id is not null then
    insert into public.hospital_incident_workflow_events
      (clinic_id, workflow_id, actor_user_id, event_type, event_note, metadata)
    values
      (new.clinic_id, v_workflow_id, new.reporter_id, 'report_received',
       'Incident report received and awaiting human triage.',
       jsonb_build_object('incident_reference', new.incident_reference));
  end if;
  return new;
end;
$function$;

drop trigger if exists hospital_incident_report_create_workflow on public.hospital_incident_reports;
create trigger hospital_incident_report_create_workflow
after insert on public.hospital_incident_reports
for each row execute function public.create_hospital_incident_workflow_on_report();

-- Backfill existing intake reports through the same trigger so historical reports
-- enter triage without changing their original immutable report rows.
insert into public.hospital_incident_workflows (clinic_id, incident_report_id)
select h.clinic_id, h.id
from public.hospital_incident_reports h
on conflict (clinic_id, incident_report_id) do nothing;

create or replace function public.manage_hospital_incident_workflow(
  p_clinic_id uuid,
  p_incident_report_id uuid,
  p_action text,
  p_department_id uuid default null,
  p_staff_profile_id uuid default null,
  p_due_at timestamptz default null,
  p_note text default null,
  p_evidence_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_workflow public.hospital_incident_workflows%rowtype;
  v_is_admin boolean;
  v_is_assignee boolean;
  v_event text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null or p_incident_report_id is null then
    raise exception 'Clinic and incident report are required' using errcode = '22023';
  end if;

  select exists (select 1 from public.clinics c
    where c.id = p_clinic_id and c.owner_user_id = v_uid)
    or exists (select 1 from public.clinic_memberships m
      where m.clinic_id = p_clinic_id and m.user_id = v_uid
        and m.status = 'active' and m.role in ('owner','admin'))
  into v_is_admin;

  if not exists (select 1 from public.clinic_memberships m
    where m.clinic_id = p_clinic_id and m.user_id = v_uid and m.status = 'active')
    and not exists (select 1 from public.clinics c
      where c.id = p_clinic_id and c.owner_user_id = v_uid) then
    raise exception 'Active clinic membership required' using errcode = '42501';
  end if;

  select * into v_workflow
  from public.hospital_incident_workflows w
  where w.clinic_id = p_clinic_id and w.incident_report_id = p_incident_report_id
  for update;
  if not found then raise exception 'Incident workflow not found' using errcode = 'P0002'; end if;

  v_is_assignee := exists (
    select 1 from public.staff_profiles s
    where s.id = v_workflow.assigned_staff_profile_id
      and s.clinic_id = p_clinic_id and s.user_id = v_uid
      and s.employment_status = 'active'
  );

  if p_action in ('assign','resolve','reopen') and not v_is_admin then
    raise exception 'Hospital administrator access required' using errcode = '42501';
  end if;
  if p_action in ('acknowledge','respond') and not (v_is_admin or v_is_assignee) then
    raise exception 'Only the assigned staff member or an administrator may perform this action' using errcode = '42501';
  end if;

  if p_action = 'assign' then
    if p_department_id is null or p_staff_profile_id is null then
      raise exception 'Department and responsible staff are required' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.staff_department_assignments a
      join public.staff_profiles s on s.id = a.staff_profile_id and s.clinic_id = a.clinic_id
      where a.clinic_id = p_clinic_id and a.department_id = p_department_id
        and a.staff_profile_id = p_staff_profile_id and a.assignment_status = 'active'
        and s.employment_status = 'active'
    ) then raise exception 'Staff member must have an active assignment in the selected department' using errcode = '22023'; end if;
    if v_workflow.workflow_status in ('resolved','closed') then
      raise exception 'Reopen the workflow before reassigning a resolved incident' using errcode = '55000';
    end if;
    update public.hospital_incident_workflows set
      department_id = p_department_id, assigned_staff_profile_id = p_staff_profile_id,
      assigned_by_user_id = v_uid, response_due_at = p_due_at,
      workflow_status = 'assigned', acknowledged_by_user_id = null, acknowledged_at = null,
      updated_at = now()
    where id = v_workflow.id;
    v_event := case when v_workflow.assigned_staff_profile_id is null then 'assigned' else 'reassigned' end;

  elsif p_action = 'acknowledge' then
    if v_workflow.assigned_staff_profile_id is null then raise exception 'Assign a responsible staff member first' using errcode = '55000'; end if;
    if v_workflow.workflow_status not in ('assigned','acknowledged') then raise exception 'Incident is not awaiting acknowledgment' using errcode = '55000'; end if;
    update public.hospital_incident_workflows set
      workflow_status = 'acknowledged', acknowledged_by_user_id = v_uid,
      acknowledged_at = coalesce(acknowledged_at, now()), updated_at = now()
    where id = v_workflow.id;
    v_event := 'acknowledged';

  elsif p_action = 'respond' then
    if length(trim(coalesce(p_note,''))) < 5 then raise exception 'Enter a meaningful response summary' using errcode = '22023'; end if;
    if v_workflow.workflow_status not in ('acknowledged','response_in_progress') then raise exception 'Acknowledge the incident before recording a response' using errcode = '55000'; end if;
    update public.hospital_incident_workflows set
      workflow_status = 'response_in_progress', response_summary = trim(p_note), updated_at = now()
    where id = v_workflow.id;
    v_event := 'response_recorded';

  elsif p_action = 'resolve' then
    if length(trim(coalesce(p_note,''))) < 10 then raise exception 'Resolution notes are required' using errcode = '22023'; end if;
    if length(trim(coalesce(p_evidence_reference,''))) < 3 then raise exception 'Provide an evidence reference before resolution' using errcode = '22023'; end if;
    if v_workflow.workflow_status not in ('acknowledged','response_in_progress') then raise exception 'Incident must be acknowledged and responded to before resolution' using errcode = '55000'; end if;
    update public.hospital_incident_workflows set
      workflow_status = 'resolved', resolution_notes = trim(p_note),
      resolution_evidence_reference = trim(p_evidence_reference),
      resolved_by_user_id = v_uid, resolved_at = now(), updated_at = now()
    where id = v_workflow.id;
    v_event := 'resolved';

  elsif p_action = 'reopen' then
    if v_workflow.workflow_status <> 'resolved' then raise exception 'Only resolved incidents can be reopened' using errcode = '55000'; end if;
    update public.hospital_incident_workflows set
      workflow_status = 'triage_pending', resolved_by_user_id = null, resolved_at = null,
      updated_at = now()
    where id = v_workflow.id;
    v_event := 'reopened';

  elsif p_action = 'note' then
    if not (v_is_admin or v_is_assignee) then raise exception 'Administrator or assigned staff access required' using errcode = '42501'; end if;
    if length(trim(coalesce(p_note,''))) < 3 then raise exception 'Enter a note' using errcode = '22023'; end if;
    v_event := 'note_added';

  else
    raise exception 'Unsupported workflow action' using errcode = '22023';
  end if;

  insert into public.hospital_incident_workflow_events
    (clinic_id, workflow_id, actor_user_id, event_type, event_note, metadata)
  values (p_clinic_id, v_workflow.id, v_uid, v_event, nullif(trim(coalesce(p_note,'')), ''),
    jsonb_strip_nulls(jsonb_build_object(
      'department_id', p_department_id, 'staff_profile_id', p_staff_profile_id,
      'response_due_at', p_due_at, 'evidence_reference', p_evidence_reference
    )));

  return jsonb_build_object('success', true, 'workflow_id', v_workflow.id, 'action', v_event);
end;
$function$;

revoke all on function public.manage_hospital_incident_workflow(uuid,uuid,text,uuid,uuid,timestamptz,text,text) from public, anon;
grant execute on function public.manage_hospital_incident_workflow(uuid,uuid,text,uuid,uuid,timestamptz,text,text) to authenticated;

create or replace function public.get_admin_hospital_incident_workflows(
  p_clinic_id uuid,
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare v_uid uuid := auth.uid(); v_rows jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Limit must be between 1 and 500' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clinics c where c.id = p_clinic_id and c.owner_user_id = v_uid)
    and not exists (select 1 from public.clinic_memberships m where m.clinic_id = p_clinic_id
      and m.user_id = v_uid and m.status = 'active' and m.role in ('owner','admin')) then
    raise exception 'Hospital administrator access required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select w.id as workflow_id, w.incident_report_id, h.incident_reference, h.category, h.severity,
      h.department_name as reported_department, h.incident_title,
      w.department_id, w.assigned_staff_profile_id,
      d.department_name as assigned_department, s.full_name as assigned_staff,
      w.workflow_status, w.response_due_at, w.acknowledged_at, w.resolved_at,
      w.created_at, (w.response_due_at is not null and w.response_due_at < now()
        and w.workflow_status not in ('resolved','closed')) as is_overdue
    from public.hospital_incident_workflows w
    join public.hospital_incident_reports h
      on h.id = w.incident_report_id and h.clinic_id = w.clinic_id
    left join public.clinic_departments d
      on d.id = w.department_id and d.clinic_id = w.clinic_id
    left join public.staff_profiles s
      on s.id = w.assigned_staff_profile_id and s.clinic_id = w.clinic_id
    where w.clinic_id = p_clinic_id
    order by w.created_at desc
    limit p_limit
  ) x;
  return jsonb_build_object('items', v_rows, 'count', jsonb_array_length(v_rows));
end;
$function$;

revoke all on function public.get_admin_hospital_incident_workflows(uuid,integer) from public, anon;
grant execute on function public.get_admin_hospital_incident_workflows(uuid,integer) to authenticated;

comment on table public.hospital_incident_workflows is
  'Linked human triage, assignment, acknowledgment, response and resolution workflow; original incident intake remains unchanged.';
comment on table public.hospital_incident_workflow_events is
  'Append-only workflow event history written by trusted trigger and SECURITY DEFINER workflow RPC.';
