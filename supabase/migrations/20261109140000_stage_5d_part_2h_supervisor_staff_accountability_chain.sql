-- Stage 5D Part 2H: supervisor-to-staff accountability chain.
-- Read-only, task-scoped chain for the assignee, direct supervisor, appointed manager, or hospital admin.
-- Does not alter task assignment, evidence, review, approval, or snapshot rules.

create or replace function public.get_task_accountability_chain(
  p_clinic_id uuid,
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
  v_task public.staff_tasks%rowtype;
  v_assignee_assignment public.staff_department_assignments%rowtype;
  v_chain jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null or p_task_id is null then
    raise exception 'Clinic and task are required' using errcode = '22023';
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

  select t.* into v_task
  from public.staff_tasks t
  where t.id = p_task_id
    and t.clinic_id = p_clinic_id;
  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  select a.* into v_assignee_assignment
  from public.staff_department_assignments a
  where a.id = v_task.assigned_to_assignment_id
    and a.clinic_id = p_clinic_id;

  if v_role not in ('owner','admin') then
    if v_profile_id is null then
      raise exception 'Active staff profile required' using errcode = '42501';
    end if;

    if v_profile_id is distinct from v_assignee_assignment.staff_profile_id
       and v_profile_id is distinct from v_assignee_assignment.supervisor_staff_profile_id
       and not exists (
         select 1
         from public.clinic_management_assignments ma
         join public.staff_department_assignments manager_assignment
           on manager_assignment.id = ma.manager_assignment_id
          and manager_assignment.clinic_id = ma.clinic_id
         where ma.clinic_id = p_clinic_id
           and manager_assignment.staff_profile_id = v_profile_id
           and ma.department_id = v_task.department_id
           and (ma.unit_id is null or ma.unit_id = v_task.unit_id)
           and ma.assignment_status in ('active','delegated')
           and ma.effective_from <= current_date
           and (ma.effective_to is null or ma.effective_to >= current_date)
           and manager_assignment.assignment_status = 'active'
           and manager_assignment.effective_from <= current_date
           and (manager_assignment.effective_to is null or manager_assignment.effective_to >= current_date)
       ) then
      raise exception 'You are not authorised to view this task accountability chain' using errcode = '42501';
    end if;
  end if;

  select jsonb_build_object(
    'task', jsonb_build_object(
      'task_id', v_task.id,
      'task_title', v_task.task_title,
      'task_status', v_task.task_status,
      'department_id', v_task.department_id,
      'unit_id', v_task.unit_id,
      'created_at', v_task.created_at,
      'assigned_to_assignment_id', v_task.assigned_to_assignment_id,
      'duty_id', v_task.duty_id,
      'duty_snapshot_source', v_task.duty_snapshot_source,
      'duty_snapshot_captured_at', v_task.duty_snapshot_captured_at,
      'review_status', v_task.review_status,
      'reviewed_at', v_task.reviewed_at,
      'completed_at', v_task.completed_at
    ),
    'assignee', case when assignee.id is null then null else jsonb_build_object(
      'staff_profile_id', assignee.id,
      'full_name', assignee.full_name,
      'staff_id', assignee.staff_id,
      'professional_role', assignee.professional_role,
      'assignment_id', v_assignee_assignment.id,
      'assignment_status', v_assignee_assignment.assignment_status,
      'effective_from', v_assignee_assignment.effective_from,
      'effective_to', v_assignee_assignment.effective_to
    ) end,
    'assigning_supervisor', case when assigner.id is null then null else jsonb_build_object(
      'staff_profile_id', assigner.id,
      'full_name', assigner.full_name,
      'staff_id', assigner.staff_id,
      'role_at_assignment', 'assigning_supervisor'
    ) end,
    'requesting_staff', case when requester.id is null then null else jsonb_build_object(
      'staff_profile_id', requester.id,
      'full_name', requester.full_name,
      'staff_id', requester.staff_id
    ) end,
    'direct_supervisor', case when direct_supervisor.id is null then null else jsonb_build_object(
      'staff_profile_id', direct_supervisor.id,
      'full_name', direct_supervisor.full_name,
      'staff_id', direct_supervisor.staff_id
    ) end,
    'reviewer', case when reviewer.id is null then null else jsonb_build_object(
      'staff_profile_id', reviewer.id,
      'full_name', reviewer.full_name,
      'staff_id', reviewer.staff_id,
      'review_status', v_task.review_status,
      'reviewed_at', v_task.reviewed_at,
      'review_notes', v_task.review_notes
    ) end,
    'current_management_appointments', coalesce(appointments.items, '[]'::jsonb),
    'evidence_summary', jsonb_build_object(
      'evidence_count', coalesce(evidence.total, 0),
      'assignee_submitted_count', coalesce(evidence.assignee_total, 0)
    ),
    'event_timeline', coalesce(events.items, '[]'::jsonb)
  )
  into v_chain
  from (select 1) anchor
  left join public.staff_profiles assignee
    on assignee.id = v_assignee_assignment.staff_profile_id
   and assignee.clinic_id = p_clinic_id
  left join public.staff_profiles assigner
    on assigner.id = v_task.assigned_by_staff_profile_id
   and assigner.clinic_id = p_clinic_id
  left join public.staff_profiles requester
    on requester.id = v_task.requested_by_staff_profile_id
   and requester.clinic_id = p_clinic_id
  left join public.staff_profiles direct_supervisor
    on direct_supervisor.id = v_assignee_assignment.supervisor_staff_profile_id
   and direct_supervisor.clinic_id = p_clinic_id
  left join public.staff_profiles reviewer
    on reviewer.id = v_task.reviewed_by_staff_profile_id
   and reviewer.clinic_id = p_clinic_id
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'appointment_id', ma.id,
      'manager_staff_profile_id', manager_staff.id,
      'manager_name', manager_staff.full_name,
      'manager_staff_id', manager_staff.staff_id,
      'leadership_role', ma.leadership_role,
      'assignment_status', ma.assignment_status,
      'effective_from', ma.effective_from,
      'effective_to', ma.effective_to,
      'appointed_by_staff_profile_id', appointing_staff.id,
      'appointed_by_name', appointing_staff.full_name
    ) order by ma.created_at) as items
    from public.clinic_management_assignments ma
    join public.staff_department_assignments manager_assignment
      on manager_assignment.id = ma.manager_assignment_id
     and manager_assignment.clinic_id = ma.clinic_id
    join public.staff_profiles manager_staff
      on manager_staff.id = manager_assignment.staff_profile_id
     and manager_staff.clinic_id = ma.clinic_id
    left join public.staff_profiles appointing_staff
      on appointing_staff.user_id = ma.appointed_by
     and appointing_staff.clinic_id = ma.clinic_id
    where ma.clinic_id = p_clinic_id
      and ma.department_id = v_task.department_id
      and (ma.unit_id is null or ma.unit_id = v_task.unit_id)
      and ma.assignment_status in ('active','delegated')
      and ma.effective_from <= current_date
      and (ma.effective_to is null or ma.effective_to >= current_date)
      and manager_assignment.assignment_status = 'active'
      and manager_assignment.effective_from <= current_date
      and (manager_assignment.effective_to is null or manager_assignment.effective_to >= current_date)
  ) appointments on true
  left join lateral (
    select count(*)::integer as total,
      count(*) filter (where e.submitted_by_staff_profile_id = v_assignee_assignment.staff_profile_id)::integer as assignee_total
    from public.staff_task_evidence e
    where e.clinic_id = p_clinic_id and e.task_id = v_task.id
  ) evidence on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'event_id', e.id,
      'event_type', e.event_type,
      'from_status', e.from_status,
      'to_status', e.to_status,
      'event_notes', e.event_notes,
      'actor_staff_profile_id', e.actor_staff_profile_id,
      'actor_name', actor.full_name,
      'created_at', e.created_at
    ) order by e.created_at, e.id) as items
    from public.staff_task_events e
    left join public.staff_profiles actor
      on actor.id = e.actor_staff_profile_id
     and actor.clinic_id = e.clinic_id
    where e.clinic_id = p_clinic_id and e.task_id = v_task.id
  ) events on true;

  return jsonb_build_object(
    'read_only', true,
    'scope', case when v_role in ('owner','admin') then 'hospital_admin'
                  when v_profile_id = v_assignee_assignment.staff_profile_id then 'assigned_staff_self'
                  when v_profile_id = v_assignee_assignment.supervisor_staff_profile_id then 'direct_supervisor'
                  else 'appointed_department_manager' end,
    'clinic_id', p_clinic_id,
    'task_id', p_task_id,
    'generated_at', now(),
    'accountability_chain', coalesce(v_chain, '{}'::jsonb)
  );
end;
$function$;

revoke all on function public.get_task_accountability_chain(uuid, uuid) from public, anon;
grant execute on function public.get_task_accountability_chain(uuid, uuid) to authenticated;
