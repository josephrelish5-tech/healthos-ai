-- Stage 3I-C-C: route active department task escalations to the correct in-app recipients.
-- In-app notifications become immediately visible in the recipient's secure inbox.
-- No email, SMS, WhatsApp, or patient-identifying information is sent.

create or replace function public.enqueue_department_task_escalation_notifications(
  p_clinic_id uuid default null,
  p_batch_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text := coalesce(auth.role(), '');
  v_now timestamptz := now();
  v_scanned integer := 0;
  v_inserted integer := 0;
begin
  if v_role <> 'service_role' then
    raise exception 'Trusted service role is required to route escalation notifications'
      using errcode = '42501';
  end if;

  if p_batch_limit is null or p_batch_limit < 1 or p_batch_limit > 2000 then
    raise exception 'Batch limit must be between 1 and 2000'
      using errcode = '22023';
  end if;

  with eligible_escalations as (
    select e.id, e.clinic_id, e.task_id, e.department_id, e.unit_id,
           e.severity, e.source, e.status, e.reason
    from public.department_task_escalations e
    where e.status in ('open', 'acknowledged')
      and (p_clinic_id is null or e.clinic_id = p_clinic_id)
    order by
      case e.severity when 'critical' then 1 when 'urgent' then 2
                      when 'high' then 3 else 4 end,
      e.created_at asc
    limit p_batch_limit
  ),
  recipient_candidates as (
    -- The assigned task's current supervisor.
    select e.id escalation_id, e.clinic_id, sp.user_id recipient_user_id,
           'task_supervisor'::text recipient_category
    from eligible_escalations e
    join public.staff_tasks t
      on t.id = e.task_id and t.clinic_id = e.clinic_id
    join public.staff_department_assignments a
      on a.id = t.assigned_to_assignment_id and a.clinic_id = e.clinic_id
    join public.staff_profiles sp
      on sp.id = a.supervisor_staff_profile_id
     and sp.clinic_id = e.clinic_id
     and sp.employment_status = 'active'
    join public.clinic_memberships cm
      on cm.clinic_id = e.clinic_id and cm.user_id = sp.user_id
     and cm.status = 'active'
    where a.assignment_status = 'active'
      and a.effective_from <= current_date
      and (a.effective_to is null or a.effective_to >= current_date)

    union all

    -- Current appointed unit managers for the affected unit.
    select e.id, e.clinic_id, manager_profile.user_id,
           'unit_manager'::text
    from eligible_escalations e
    join public.clinic_management_assignments m
      on m.clinic_id = e.clinic_id
     and m.department_id = e.department_id
     and m.unit_id = e.unit_id
     and e.unit_id is not null
     and m.leadership_role in ('unit_head', 'unit_supervisor', 'coordinator')
     and m.assignment_status in ('active', 'delegated')
     and m.effective_from <= current_date
     and (m.effective_to is null or m.effective_to >= current_date)
    join public.staff_department_assignments manager_assignment
      on manager_assignment.id = m.manager_assignment_id
     and manager_assignment.clinic_id = e.clinic_id
     and manager_assignment.assignment_status = 'active'
     and manager_assignment.effective_from <= current_date
     and (manager_assignment.effective_to is null or manager_assignment.effective_to >= current_date)
    join public.staff_profiles manager_profile
      on manager_profile.id = manager_assignment.staff_profile_id
     and manager_profile.clinic_id = e.clinic_id
     and manager_profile.employment_status = 'active'
    join public.clinic_memberships cm
      on cm.clinic_id = e.clinic_id
     and cm.user_id = manager_profile.user_id
     and cm.status = 'active'

    union all

    -- Department-level leadership receives department escalations,
    -- including escalations belonging to a unit in that department.
    select e.id, e.clinic_id, manager_profile.user_id,
           'department_manager'::text
    from eligible_escalations e
    join public.clinic_management_assignments m
      on m.clinic_id = e.clinic_id
     and m.department_id = e.department_id
     and m.unit_id is null
     and m.leadership_role in ('department_head', 'deputy_head', 'department_supervisor', 'coordinator')
     and m.assignment_status in ('active', 'delegated')
     and m.effective_from <= current_date
     and (m.effective_to is null or m.effective_to >= current_date)
    join public.staff_department_assignments manager_assignment
      on manager_assignment.id = m.manager_assignment_id
     and manager_assignment.clinic_id = e.clinic_id
     and manager_assignment.assignment_status = 'active'
     and manager_assignment.effective_from <= current_date
     and (manager_assignment.effective_to is null or manager_assignment.effective_to >= current_date)
    join public.staff_profiles manager_profile
      on manager_profile.id = manager_assignment.staff_profile_id
     and manager_profile.clinic_id = e.clinic_id
     and manager_profile.employment_status = 'active'
    join public.clinic_memberships cm
      on cm.clinic_id = e.clinic_id
     and cm.user_id = manager_profile.user_id
     and cm.status = 'active'

    union all

    -- Hospital owner/admin are included only for critical escalations,
    -- avoiding unnecessary hospital-wide alerts for routine issues.
    select e.id, e.clinic_id, cm.user_id,
           'hospital_admin_critical'::text
    from eligible_escalations e
    join public.clinic_memberships cm
      on cm.clinic_id = e.clinic_id
     and cm.status = 'active'
     and cm.role in ('owner', 'admin')
    where e.severity = 'critical'
  ),
  recipients as (
    select rc.escalation_id, rc.clinic_id, rc.recipient_user_id,
           array_agg(distinct rc.recipient_category order by rc.recipient_category) recipient_categories
    from recipient_candidates rc
    group by rc.escalation_id, rc.clinic_id, rc.recipient_user_id
  ),
  inserted as (
    insert into public.department_task_notifications (
      clinic_id, escalation_id, recipient_user_id, notification_type,
      channel, title, message, dedupe_key, delivery_status,
      attempt_count, last_attempt_at, delivered_at, metadata,
      created_at, updated_at
    )
    select r.clinic_id, r.escalation_id, r.recipient_user_id,
      'task_escalation', 'in_app',
      case when e.severity = 'critical' then 'Critical department task escalation'
           when e.severity = 'urgent' then 'Urgent department task needs attention'
           else 'Department task needs attention' end,
      'A department task has been escalated. Open the HealthOS escalation inbox to review the issue and take the action permitted by your role.',
      r.escalation_id::text || ':route:v1',
      'delivered', 1, v_now, v_now,
      jsonb_build_object(
        'routing_version', 1,
        'recipient_categories', to_jsonb(r.recipient_categories),
        'department_id', e.department_id,
        'unit_id', e.unit_id,
        'severity', e.severity,
        'source', e.source,
        'escalation_status_at_routing', e.status,
        'contains_patient_identifiers', false
      ),
      v_now, v_now
    from recipients r
    join eligible_escalations e on e.id = r.escalation_id
    on conflict (clinic_id, recipient_user_id, dedupe_key) do nothing
    returning id
  )
  select (select count(*) from eligible_escalations),
         (select count(*) from inserted)
    into v_scanned, v_inserted;

  return jsonb_build_object(
    'success', true,
    'mode', 'trusted_service_role_routing',
    'clinic_id', p_clinic_id,
    'active_escalations_scanned', v_scanned,
    'notifications_created', v_inserted,
    'duplicate_notifications_prevented', true,
    'delivery_semantics', 'in_app inbox availability; no external message provider used',
    'routed_at', v_now
  );
end;
$function$;

revoke all on function public.enqueue_department_task_escalation_notifications(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.enqueue_department_task_escalation_notifications(uuid, integer)
  to service_role;

comment on function public.enqueue_department_task_escalation_notifications(uuid, integer)
  is 'Routes active department task escalations to current scoped supervisors/managers and hospital owner/admin only for critical severity. Service-role only; idempotent in-app inbox delivery; no PHI or external messaging.';
