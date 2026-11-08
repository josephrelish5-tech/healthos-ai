-- Stage 3I-B: idempotent automatic detection of overdue and blocked department tasks.
-- Scheduling is intentionally separate: this RPC is safe to run repeatedly from a trusted scheduler.

create unique index if not exists department_task_escalations_one_active_auto_per_task_idx
on public.department_task_escalations (clinic_id, task_id, source)
where status in ('open','acknowledged')
  and source in ('overdue','blocked','system');

create or replace function public.process_department_task_escalations(
  p_clinic_id uuid default null,
  p_batch_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce(auth.role(), '');
  v_system_actor uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_created integer := 0;
  v_scanned integer := 0;
  v_now timestamptz := now();
begin
  if p_batch_limit is null or p_batch_limit < 1 or p_batch_limit > 2000 then
    raise exception 'Batch limit must be between 1 and 2000' using errcode = '22023';
  end if;

  -- Global processing is reserved for the trusted service role.
  -- A signed-in hospital administrator may process only their own clinic.
  if v_role <> 'service_role' then
    if v_uid is null or p_clinic_id is null then
      raise exception 'Service role or signed-in hospital administrator for one clinic required'
        using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.clinic_memberships cm
      where cm.clinic_id = p_clinic_id
        and cm.user_id = v_uid
        and cm.status = 'active'
        and cm.role in ('owner','admin')
    ) then
      raise exception 'Only a hospital administrator can run this clinic escalation scan'
        using errcode = '42501';
    end if;
  end if;

  with eligible as (
    select
      t.id as task_id,
      t.clinic_id,
      t.department_id,
      t.unit_id,
      t.task_title,
      t.task_status,
      t.priority,
      t.due_at,
      case when t.task_status = 'blocked' then 'blocked' else 'overdue' end as escalation_source,
      case
        when lower(t.priority) in ('critical','emergency') then 'critical'
        when lower(t.priority) in ('urgent') then 'urgent'
        when lower(t.priority) in ('high') then 'high'
        else 'normal'
      end as escalation_severity
    from public.staff_tasks t
    where t.task_status not in ('completed','cancelled')
      and (
        (t.due_at is not null and t.due_at < v_now)
        or t.task_status = 'blocked'
      )
      and (p_clinic_id is null or t.clinic_id = p_clinic_id)
    order by
      case when t.task_status = 'blocked' then 0 else 1 end,
      t.due_at asc nulls last,
      t.created_at asc
    limit p_batch_limit
    for update of t skip locked
  ),
  inserted as (
    insert into public.department_task_escalations (
      clinic_id, task_id, department_id, unit_id,
      escalation_level, severity, source, status, reason,
      raised_by_user_id, raised_by_staff_profile_id, created_at, updated_at
    )
    select
      e.clinic_id,
      e.task_id,
      e.department_id,
      e.unit_id,
      1,
      e.escalation_severity,
      e.escalation_source,
      'open',
      case
        when e.escalation_source = 'blocked'
          then 'Automatically flagged: task is currently blocked and requires supervisor intervention.'
        else 'Automatically flagged: task passed its recorded due time at ' || e.due_at::text || '.'
      end,
      v_system_actor,
      null,
      v_now,
      v_now
    from eligible e
    on conflict (clinic_id, task_id, source)
      where status in ('open','acknowledged')
        and source in ('overdue','blocked','system')
    do nothing
    returning id, clinic_id, task_id, department_id, severity, source, reason
  ),
  logged as (
    insert into public.department_task_escalation_events (
      clinic_id, escalation_id, actor_user_id, action_key, event_notes, metadata, created_at
    )
    select
      i.clinic_id,
      i.id,
      v_system_actor,
      'raised',
      i.reason,
      jsonb_build_object(
        'origin', 'healthos_automatic_escalation_scan',
        'task_id', i.task_id,
        'department_id', i.department_id,
        'severity', i.severity,
        'source', i.source
      ),
      v_now
    from inserted i
    returning escalation_id
  ),
  task_events as (
    insert into public.staff_task_events (
      clinic_id, task_id, actor_staff_profile_id, event_type, event_notes, metadata, created_at
    )
    select
      i.clinic_id,
      i.task_id,
      null,
      'escalated',
      'Automatically escalated by HealthOS task monitoring.',
      jsonb_build_object('escalation_id', i.id, 'severity', i.severity, 'source', i.source, 'system_generated', true),
      v_now
    from inserted i
    returning id
  )
  select
    (select count(*) from eligible),
    (select count(*) from inserted)
  into v_scanned, v_created;

  return jsonb_build_object(
    'success', true,
    'mode', case when v_role = 'service_role' then 'trusted_global_scan' else 'clinic_admin_scan' end,
    'clinic_id', p_clinic_id,
    'tasks_scanned', v_scanned,
    'new_escalations_created', v_created,
    'duplicate_active_escalations_prevented', greatest(v_scanned - v_created, 0),
    'processed_at', v_now,
    'next_step', 'Connect this RPC to a trusted scheduled worker to run automatically.'
  );
end;
$function$;

revoke all on function public.process_department_task_escalations(uuid,integer) from public, anon, authenticated;
grant execute on function public.process_department_task_escalations(uuid,integer) to service_role;
grant execute on function public.process_department_task_escalations(uuid,integer) to authenticated;

comment on function public.process_department_task_escalations(uuid,integer) is
'Idempotent overdue/blocked task scanner. Global scope is service_role only; authenticated callers must be an active owner/admin and provide their clinic_id. Scheduling is external and must use a trusted service-role worker.';