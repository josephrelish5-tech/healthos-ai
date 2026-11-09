-- Stage 5D Part 2M: escalation notification delivery reliability and incident monitoring.
-- Read-only health reporting. Does not resend, mutate, or mark notifications.
-- In-app inbox delivery is distinct from email/SMS/WhatsApp provider delivery.

create or replace function public.get_escalation_notification_delivery_health(
  p_clinic_id uuid,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_counts jsonb;
  v_scheduler jsonb := jsonb_build_object(
    'pg_cron_installed', exists(select 1 from pg_catalog.pg_extension where extname = 'pg_cron'),
    'pg_net_installed', exists(select 1 from pg_catalog.pg_extension where extname = 'pg_net'),
    'job_catalog_available', pg_catalog.to_regclass('cron.job') is not null,
    'http_response_catalog_available', pg_catalog.to_regclass('net._http_response') is not null
  );
  v_job jsonb := null;
  v_runs jsonb := '[]'::jsonb;
  v_http jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_clinic_id is null then
    raise exception 'Clinic is required' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'Monitoring limit must be between 1 and 50' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.user_id = v_uid
      and cm.status = 'active'
      and cm.role in ('owner', 'admin')
  ) then
    raise exception 'Hospital administrator access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where n.delivery_status = 'pending'),
    'failed', count(*) filter (where n.delivery_status = 'failed'),
    'delivered_to_in_app_inbox', count(*) filter (where n.delivery_status = 'delivered'),
    'read', count(*) filter (where n.read_at is not null),
    'unread', count(*) filter (where n.read_at is null),
    'oldest_pending_at', min(n.created_at) filter (where n.delivery_status = 'pending'),
    'oldest_pending_age_minutes', case
      when min(n.created_at) filter (where n.delivery_status = 'pending') is null then null
      else greatest(0, floor(extract(epoch from (
        now() - min(n.created_at) filter (where n.delivery_status = 'pending')
      )) / 60)::integer)
    end,
    'max_recorded_attempt_count', max(n.attempt_count),
    'channels', coalesce(jsonb_agg(distinct n.channel) filter (where n.channel is not null), '[]'::jsonb)
  )
  into v_counts
  from public.department_task_notifications n
  where n.clinic_id = p_clinic_id;

  -- Scheduler catalogs are optional until pg_cron and pg_net are deliberately enabled.
  if pg_catalog.to_regclass('cron.job') is not null then
    execute $sql$
      select to_jsonb(j)
      from (
        select jobid, jobname, schedule, active
        from cron.job
        where jobname = 'healthos-escalation-notification-routing'
        order by jobid desc
        limit 1
      ) j
    $sql$ into v_job;

    if pg_catalog.to_regclass('cron.job_run_details') is not null then
      execute format(
        'select coalesce(jsonb_agg(to_jsonb(x) order by x.start_time desc), ''[]''::jsonb)
         from (
           select r.status, r.start_time, r.end_time, r.return_message
           from cron.job_run_details r
           join cron.job j on j.jobid = r.jobid
           where j.jobname = %L
           order by r.start_time desc
           limit %s
         ) x',
        'healthos-escalation-notification-routing',
        p_limit
      ) into v_runs;
    end if;
  end if;

  if pg_catalog.to_regclass('net._http_response') is not null
     and pg_catalog.to_regclass('cron.job') is not null then
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x) order by x.created desc), ''[]''::jsonb)
       from (
         select r.status_code, r.timed_out, r.error_msg, r.created
         from net._http_response r
         where r.created >= now() - interval ''24 hours''
           and (r.status_code >= 400 or r.error_msg is not null or r.timed_out is true)
         order by r.created desc
         limit %s
       ) x',
      p_limit
    ) into v_http;
  end if;

  return jsonb_build_object(
    'clinic_id', p_clinic_id,
    'scope', 'hospital_owner_admin',
    'notification_semantics', 'delivered means available in the secure in-app inbox; it does not mean read and does not represent email, SMS, or WhatsApp delivery',
    'counts', coalesce(v_counts, '{}'::jsonb),
    'scheduler', v_scheduler || jsonb_build_object(
      'configured_job', v_job,
      'recent_job_runs', v_runs,
      'recent_http_failures_24h', v_http
    ),
    'generated_at', now()
  );
end;
$function$;

revoke all on function public.get_escalation_notification_delivery_health(uuid, integer)
  from public, anon;
grant execute on function public.get_escalation_notification_delivery_health(uuid, integer)
  to authenticated;

comment on function public.get_escalation_notification_delivery_health(uuid, integer)
is 'Read-only hospital-owner/admin report for in-app escalation notification backlog, failures, cron job runs and pg_net HTTP failures. Does not resend or mutate notifications.';
