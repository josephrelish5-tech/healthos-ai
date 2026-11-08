-- Stage 3I-D: hospital-wide escalation monitoring for authorised clinic administrators.
create or replace function public.get_department_task_escalation_monitoring(
  p_clinic_id uuid,
  p_status text default null,
  p_severity text default null,
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
  v_items jsonb;
  v_counts jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null then raise exception 'Clinic is required' using errcode = '22023'; end if;
  if p_status is not null and p_status not in ('open','acknowledged','resolved','dismissed') then raise exception 'Invalid escalation status filter' using errcode = '22023'; end if;
  if p_severity is not null and p_severity not in ('normal','high','urgent','critical') then raise exception 'Invalid escalation severity filter' using errcode = '22023'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then raise exception 'Monitoring limit must be between 1 and 200' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid
      and cm.status = 'active' and cm.role in ('owner','admin')
  ) then raise exception 'Hospital administrator access required' using errcode = '42501'; end if;

  select jsonb_build_object(
    'open', count(*) filter (where e.status = 'open'),
    'acknowledged', count(*) filter (where e.status = 'acknowledged'),
    'resolved', count(*) filter (where e.status = 'resolved'),
    'dismissed', count(*) filter (where e.status = 'dismissed'),
    'critical', count(*) filter (where e.severity = 'critical' and e.status in ('open','acknowledged')),
    'urgent', count(*) filter (where e.severity = 'urgent' and e.status in ('open','acknowledged')),
    'high', count(*) filter (where e.severity = 'high' and e.status in ('open','acknowledged')),
    'normal', count(*) filter (where e.severity = 'normal' and e.status in ('open','acknowledged'))
  ) into v_counts
  from public.department_task_escalations e where e.clinic_id = p_clinic_id;

  select coalesce(jsonb_agg(q.item order by q.severity_rank, q.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select
      case e.severity when 'critical' then 1 when 'urgent' then 2 when 'high' then 3 else 4 end as severity_rank,
      e.created_at,
      jsonb_build_object(
        'id', e.id, 'task_id', e.task_id, 'task_title', t.task_title,
        'task_status', t.task_status, 'due_at', t.due_at,
        'department_id', e.department_id, 'department_name', d.department_name,
        'unit_id', e.unit_id, 'unit_name', u.unit_name,
        'severity', e.severity, 'source', e.source,
        'escalation_level', e.escalation_level, 'status', e.status,
        'reason', e.reason, 'created_at', e.created_at,
        'acknowledged_at', e.acknowledged_at, 'resolved_at', e.resolved_at,
        'resolution_notes', e.resolution_notes,
        'events', coalesce((
          select jsonb_agg(jsonb_build_object(
            'action', ev.action_key, 'notes', ev.event_notes,
            'actor_user_id', ev.actor_user_id, 'created_at', ev.created_at
          ) order by ev.created_at asc)
          from public.department_task_escalation_events ev
          where ev.clinic_id = e.clinic_id and ev.escalation_id = e.id
        ), '[]'::jsonb)
      ) as item
    from public.department_task_escalations e
    join public.staff_tasks t on t.id = e.task_id and t.clinic_id = e.clinic_id
    left join public.clinic_departments d on d.id = e.department_id and d.clinic_id = e.clinic_id
    left join public.clinic_units u on u.id = e.unit_id and u.clinic_id = e.clinic_id
    where e.clinic_id = p_clinic_id
      and (p_status is null or e.status = p_status)
      and (p_severity is null or e.severity = p_severity)
    order by severity_rank, e.created_at desc
    limit p_limit
  ) q;

  return jsonb_build_object(
    'clinic_id', p_clinic_id, 'scope', 'hospital_wide_admin',
    'counts', coalesce(v_counts, '{}'::jsonb),
    'items', coalesce(v_items, '[]'::jsonb),
    'generated_at', now(), 'limit', p_limit
  );
end;
$function$;

revoke all on function public.get_department_task_escalation_monitoring(uuid,text,text,integer) from public, anon;
grant execute on function public.get_department_task_escalation_monitoring(uuid,text,text,integer) to authenticated;
comment on function public.get_department_task_escalation_monitoring(uuid,text,text,integer)
is 'Hospital-wide escalation monitoring restricted to active clinic owners and administrators; returns filtered queue, summary counts and event history.';
