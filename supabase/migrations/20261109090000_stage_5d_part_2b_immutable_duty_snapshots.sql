-- Stage 5D Part 2B: immutable snapshot of the approved duty at assignment time.
-- Additive change. Existing task/review status rules are not changed.
-- Existing rows are explicitly labelled as current-state backfills, not historical proof.

alter table public.staff_tasks
  add column if not exists duty_snapshot jsonb,
  add column if not exists duty_snapshot_captured_at timestamptz,
  add column if not exists duty_snapshot_source text;

alter table public.staff_tasks
  add constraint staff_tasks_duty_snapshot_object_chk
    check (duty_snapshot is null or jsonb_typeof(duty_snapshot) = 'object'),
  add constraint staff_tasks_duty_snapshot_source_chk
    check (duty_snapshot_source is null or duty_snapshot_source in
      ('captured_at_assignment','backfilled_current_state'));

-- Backfill only where the task already points to a duty and the current
-- referenced duty/profile/department-role records still exist. The source label
-- deliberately prevents these rows being misrepresented as original snapshots.
update public.staff_tasks t
set duty_snapshot = jsonb_build_object(
      'duty_id', jd.id,
      'duty_code', jd.duty_code,
      'duty_title', jd.duty_title,
      'duty_description', jd.duty_description,
      'duty_category', jd.duty_category,
      'expected_frequency', jd.expected_frequency,
      'evidence_required', jd.evidence_required,
      'supervisor_review_required', jd.supervisor_review_required,
      'separate_approval_required', jd.separate_approval_required,
      'clinical_or_regulated_scope', jd.clinical_or_regulated_scope,
      'validation_status_at_backfill', jd.validation_status,
      'validated_by_at_backfill', jd.validated_by,
      'validated_at_at_backfill', jd.validated_at,
      'job_profile_id', jp.id,
      'job_title', jp.job_title,
      'job_purpose', jp.job_purpose,
      'job_summary', jp.job_summary,
      'qualification_requirements', jp.qualification_requirements,
      'scope_notes', jp.scope_notes,
      'job_profile_validation_status_at_backfill', jp.validation_status,
      'job_profile_validated_by_at_backfill', jp.validated_by,
      'job_profile_validated_at_at_backfill', jp.validated_at,
      'department_role_id', dr.id,
      'department_id', dr.department_id,
      'captured_at', now(),
      'snapshot_basis', 'current linked records at migration time; not verified as original assignment-time content'
    ),
    duty_snapshot_captured_at = now(),
    duty_snapshot_source = 'backfilled_current_state'
from public.clinic_job_duties jd
join public.clinic_job_profiles jp
  on jp.id = jd.job_profile_id and jp.clinic_id = jd.clinic_id
join public.clinic_department_roles dr
  on dr.id = jp.department_role_id and dr.clinic_id = jp.clinic_id
where t.duty_id = jd.id
  and t.clinic_id = jd.clinic_id
  and t.duty_snapshot is null;

create or replace function public.protect_staff_task_duty_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.duty_id is distinct from new.duty_id then
    raise exception 'A task duty link is immutable after task creation';
  end if;

  if old.duty_snapshot is not null
     and (
       old.duty_snapshot is distinct from new.duty_snapshot
       or old.duty_snapshot_captured_at is distinct from new.duty_snapshot_captured_at
       or old.duty_snapshot_source is distinct from new.duty_snapshot_source
     ) then
    raise exception 'The task duty snapshot is immutable';
  end if;

  if old.duty_snapshot is null and new.duty_snapshot is not null
     and new.duty_snapshot_source is null then
    raise exception 'A duty snapshot source is required';
  end if;

  return new;
end;
$function$;

revoke all on function public.protect_staff_task_duty_snapshot() from public, anon, authenticated;

drop trigger if exists staff_tasks_protect_duty_snapshot
  on public.staff_tasks;

create trigger staff_tasks_protect_duty_snapshot
before update of duty_id, duty_snapshot, duty_snapshot_captured_at, duty_snapshot_source
on public.staff_tasks
for each row
execute function public.protect_staff_task_duty_snapshot();


create or replace function public.create_supervised_staff_task(
  p_clinic_id uuid,
  p_assignment_id uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_due_at timestamptz,
  p_duty_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_profile uuid;
  v_assignment public.staff_department_assignments%rowtype;
  v_duty public.clinic_job_duties%rowtype;
  v_duty_snapshot jsonb := null;
  v_snapshot_at timestamptz;
  v_task uuid;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_clinic_id is null or p_assignment_id is null then
    raise exception 'Clinic and target staff assignment are required';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(p_title) > 200 then
    raise exception 'Task title must be 3 to 200 characters';
  end if;
  if length(coalesce(p_description, '')) > 3000 then
    raise exception 'Task description is too long';
  end if;
  if p_priority not in ('low','normal','high','urgent') then
    raise exception 'Invalid task priority';
  end if;
  if p_due_at is not null and p_due_at < now() then
    raise exception 'Deadline must be in the future';
  end if;

  select cm.role into v_role
  from public.clinic_memberships cm
  where cm.clinic_id = p_clinic_id and cm.user_id = v_uid and cm.status = 'active'
  limit 1;
  if v_role is null then raise exception 'Active membership required'; end if;

  select sp.id into v_profile
  from public.staff_profiles sp
  where sp.clinic_id = p_clinic_id and sp.user_id = v_uid
    and sp.employment_status = 'active'
  limit 1;
  if v_role not in ('owner','admin') and v_profile is null then
    raise exception 'Active staff profile required';
  end if;

  select sda.* into v_assignment
  from public.staff_department_assignments sda
  where sda.id = p_assignment_id
    and sda.clinic_id = p_clinic_id
    and sda.assignment_status = 'active'
    and sda.effective_from <= current_date
    and (sda.effective_to is null or sda.effective_to >= current_date);
  if not found then raise exception 'Target staff assignment is not active'; end if;

  if v_role not in ('owner','admin') and not exists (
    select 1
    from public.clinic_management_assignments m
    join public.staff_department_assignments ma
      on ma.id = m.manager_assignment_id and ma.clinic_id = m.clinic_id
    where m.clinic_id = p_clinic_id
      and ma.staff_profile_id = v_profile
      and m.department_id = v_assignment.department_id
      and (m.unit_id is null or m.unit_id = v_assignment.unit_id)
      and m.assignment_status in ('active','delegated')
      and m.effective_from <= current_date
      and (m.effective_to is null or m.effective_to >= current_date)
  ) then
    raise exception 'You cannot assign tasks outside your managed department or unit';
  end if;

  if p_duty_id is not null then
    select jd.* into v_duty
    from public.clinic_job_duties jd
    where jd.id = p_duty_id
      and jd.clinic_id = p_clinic_id
      and jd.is_active
      and jd.validation_status = 'hospital_approved';
    if not found then
      raise exception 'Only hospital-approved duties can be linked to tasks';
    end if;

    if not exists (
      select 1
      from public.clinic_job_profiles jp
      join public.clinic_department_roles dr
        on dr.id = jp.department_role_id and dr.clinic_id = jp.clinic_id
      where jp.id = v_duty.job_profile_id
        and jp.clinic_id = p_clinic_id
        and jp.validation_status = 'hospital_approved'
        and jp.is_active
        and dr.department_id = v_assignment.department_id
    ) then
      raise exception 'Duty does not belong to the assigned department';
    end if;

    v_snapshot_at := clock_timestamp();

    select jsonb_build_object(
      'duty_id', v_duty.id,
      'duty_code', v_duty.duty_code,
      'duty_title', v_duty.duty_title,
      'duty_description', v_duty.duty_description,
      'duty_category', v_duty.duty_category,
      'expected_frequency', v_duty.expected_frequency,
      'evidence_required', v_duty.evidence_required,
      'supervisor_review_required', v_duty.supervisor_review_required,
      'separate_approval_required', v_duty.separate_approval_required,
      'clinical_or_regulated_scope', v_duty.clinical_or_regulated_scope,
      'validation_status_at_assignment', v_duty.validation_status,
      'validated_by_at_assignment', v_duty.validated_by,
      'validated_at_at_assignment', v_duty.validated_at,
      'job_profile_id', jp.id,
      'job_title', jp.job_title,
      'job_purpose', jp.job_purpose,
      'job_summary', jp.job_summary,
      'qualification_requirements', jp.qualification_requirements,
      'scope_notes', jp.scope_notes,
      'job_profile_validation_status_at_assignment', jp.validation_status,
      'job_profile_validated_by_at_assignment', jp.validated_by,
      'job_profile_validated_at_at_assignment', jp.validated_at,
      'department_role_id', dr.id,
      'department_id', dr.department_id,
      'captured_at', v_snapshot_at,
      'snapshot_basis', 'approved duty and job profile at task assignment'
    )
    into v_duty_snapshot
    from public.clinic_job_profiles jp
    join public.clinic_department_roles dr
      on dr.id = jp.department_role_id and dr.clinic_id = jp.clinic_id
    where jp.id = v_duty.job_profile_id and jp.clinic_id = p_clinic_id;
  end if;

  insert into public.staff_tasks (
    clinic_id, duty_id, duty_snapshot, duty_snapshot_captured_at,
    duty_snapshot_source, department_id, unit_id,
    assigned_to_assignment_id, assigned_by_staff_profile_id,
    requested_by_staff_profile_id, task_title, task_description,
    priority, task_status, due_at, requires_evidence,
    requires_supervisor_review, requires_separate_approval, created_by
  )
  values (
    p_clinic_id, p_duty_id, v_duty_snapshot, v_snapshot_at,
    case when p_duty_id is null then null else 'captured_at_assignment' end,
    v_assignment.department_id, v_assignment.unit_id,
    p_assignment_id, v_profile, v_profile, trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    p_priority, 'assigned', p_due_at,
    coalesce(v_duty.evidence_required, false),
    coalesce(v_duty.supervisor_review_required, true),
    coalesce(v_duty.separate_approval_required, false),
    v_uid
  )
  returning id into v_task;

  insert into public.staff_task_events (
    clinic_id, task_id, actor_staff_profile_id, event_type,
    to_status, event_notes, metadata
  )
  values (
    p_clinic_id, v_task, v_profile, 'assigned', 'assigned',
    'Task assigned',
    jsonb_build_object(
      'assigned_by_user_id', v_uid,
      'assignment_id', p_assignment_id,
      'duty_id', p_duty_id,
      'duty_snapshot', v_duty_snapshot,
      'duty_snapshot_captured_at', v_snapshot_at,
      'duty_snapshot_source',
        case when p_duty_id is null then null else 'captured_at_assignment' end
    )
  );

  return jsonb_build_object(
    'success', true,
    'task_id', v_task,
    'duty_snapshot_captured', p_duty_id is not null
  );
end;
$function$;

revoke all on function public.create_supervised_staff_task(
  uuid, uuid, text, text, text, timestamptz, uuid
) from public, anon;
grant execute on function public.create_supervised_staff_task(
  uuid, uuid, text, text, text, timestamptz, uuid
) to authenticated;
