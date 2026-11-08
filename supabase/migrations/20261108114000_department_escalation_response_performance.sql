-- Stage 3I-F: escalation response performance and accountability reporting.
create or replace function public.get_department_escalation_performance(
  p_clinic_id uuid,
  p_days integer default 30,
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
  v_since timestamptz;
  v_departments jsonb;
  v_repeated jsonb;
  v_critical jsonb;
  v_totals jsonb;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_clinic_id is null then raise exception 'Clinic is required' using errcode = '22023'; end if;
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'Reporting period must be between 1 and 365 days' using errcode = '22023'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then raise exception 'Report limit must be between 1 and 200' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id and cm.user_id = v_uid
      and cm.status = 'active' and cm.role in ('owner','admin')
  ) then raise exception 'Hospital administrator access required' using errcode = '42501'; end if;

  v_since := now() - make_interval(days => p_days);

  select jsonb_build_object(
    'total', count(*),
    'open', count(*) filter (where e.status = 'open'),
    'acknowledged', count(*) filter (where e.status = 'acknowledged'),
    'resolved', count(*) filter (where e.status = 'resolved'),
    'dismissed', count(*) filter (where e.status = 'dismissed'),
    'unresolved_critical', count(*) filter (where e.severity = 'critical' and e.status in ('open','acknowledged')),
    'unresolved_urgent', count(*) filter (where e.severity = 'urgent' and e.status in ('open','acknowledged')),
    'acknowledged_within_30m', count(*) filter (where e.acknowledged_at is not null and e.acknowledged_at <= e.created_at + interval '30 minutes'),
    'resolved_within_4h', count(*) filter (where e.resolved_at is not null and e.resolved_at <= e.created_at + interval '4 hours'),
    'avg_ack_minutes', round((avg(extract(epoch from (e.acknowledged_at - e.created_at))/60.0) filter (where e.acknowledged_at is not null))::numeric, 1),
    'avg_resolution_minutes', round((avg(extract(epoch from (e.resolved_at - e.created_at))/60.0) filter (where e.resolved_at is not null))::numeric, 1)
  ) into v_totals
  from public.department_task_escalations e
  where e.clinic_id = p_clinic_id and e.created_at >= v_since;

  select coalesce(jsonb_agg(x.item order by x.open_count desc, x.total_count desc), '[]'::jsonb)
  into v_departments
  from (
    select jsonb_build_object(
      'department_id', d.id,
      'department_name', d.department_name,
      'total', count(e.id),
      'open', count(e.id) filter (where e.status = 'open'),
      'acknowledged', count(e.id) filter (where e.status = 'acknowledged'),
      'resolved', count(e.id) filter (where e.status = 'resolved'),
      'unresolved_critical', count(e.id) filter (where e.severity = 'critical' and e.status in ('open','acknowledged')),
      'avg_ack_minutes', round((avg(extract(epoch from (e.acknowledged_at-e.created_at))/60.0) filter (where e.acknowledged_at is not null))::numeric,1),
      'avg_resolution_minutes', round((avg(extract(epoch from (e.resolved_at-e.created_at))/60.0) filter (where e.resolved_at is not null))::numeric,1),
      'acknowledged_within_30m', count(e.id) filter (where e.acknowledged_at is not null and e.acknowledged_at <= e.created_at + interval '30 minutes'),
      'resolved_within_4h', count(e.id) filter (where e.resolved_at is not null and e.resolved_at <= e.created_at + interval '4 hours')
    ) as item,
    count(e.id) filter (where e.status in ('open','acknowledged')) as open_count,
    count(e.id) as total_count
    from public.clinic_departments d
    left join public.department_task_escalations e
      on e.department_id = d.id and e.clinic_id = d.clinic_id and e.created_at >= v_since
    where d.clinic_id = p_clinic_id and d.is_active
    group by d.id,d.department_name
  ) x;

  select coalesce(jsonb_agg(q.item order by q.escalation_count desc, q.last_raised_at desc), '[]'::jsonb)
  into v_repeated
  from (
    select jsonb_build_object(
      'task_id', e.task_id,
      'task_title', max(t.task_title),
      'department_name', max(d.department_name),
      'unit_name', max(u.unit_name),
      'escalation_count', count(*),
      'open_count', count(*) filter (where e.status in ('open','acknowledged')),
      'last_raised_at', max(e.created_at)
    ) as item,
    count(*) as escalation_count,
    max(e.created_at) as last_raised_at
    from public.department_task_escalations e
    join public.staff_tasks t on t.id=e.task_id and t.clinic_id=e.clinic_id
    left join public.clinic_departments d on d.id=e.department_id and d.clinic_id=e.clinic_id
    left join public.clinic_units u on u.id=e.unit_id and u.clinic_id=e.clinic_id
    where e.clinic_id=p_clinic_id and e.created_at >= v_since
    group by e.task_id
    having count(*) > 1
    order by count(*) desc, max(e.created_at) desc
    limit p_limit
  ) q;

  select coalesce(jsonb_agg(q.item order by q.created_at asc), '[]'::jsonb)
  into v_critical
  from (
    select jsonb_build_object(
      'escalation_id', e.id,
      'task_id', e.task_id,
      'task_title', t.task_title,
      'department_name', d.department_name,
      'unit_name', u.unit_name,
      'status', e.status,
      'source', e.source,
      'reason', e.reason,
      'created_at', e.created_at,
      'minutes_open', greatest(0, floor(extract(epoch from (now()-e.created_at))/60)::integer)
    ) as item,
    e.created_at
    from public.department_task_escalations e
    join public.staff_tasks t on t.id=e.task_id and t.clinic_id=e.clinic_id
    left join public.clinic_departments d on d.id=e.department_id and d.clinic_id=e.clinic_id
    left join public.clinic_units u on u.id=e.unit_id and u.clinic_id=e.clinic_id
    where e.clinic_id=p_clinic_id and e.severity='critical'
      and e.status in ('open','acknowledged')
    order by e.created_at asc
    limit p_limit
  ) q;

  return jsonb_build_object(
    'clinic_id', p_clinic_id,
    'period_days', p_days,
    'since', v_since,
    'totals', coalesce(v_totals,'{}'::jsonb),
    'departments', coalesce(v_departments,'[]'::jsonb),
    'repeated_tasks', coalesce(v_repeated,'[]'::jsonb),
    'unresolved_critical', coalesce(v_critical,'[]'::jsonb),
    'generated_at', now()
  );
end;
$function$;

revoke all on function public.get_department_escalation_performance(uuid,integer,integer) from public, anon;
grant execute on function public.get_department_escalation_performance(uuid,integer,integer) to authenticated;
comment on function public.get_department_escalation_performance(uuid,integer,integer)
is 'Administrator-only escalation response performance report with department metrics, repeated-task detection and unresolved critical escalations.';
