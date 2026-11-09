-- Stage 5D Part 2L: scheduled, trusted escalation notification routing.
-- This migration prepares the scheduler but does NOT create Vault secrets or activate a job.
-- Activation is a deliberate one-time SQL Editor step after secrets are stored securely.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.healthos_schedule_escalation_notification_router()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_project_url text;
  v_service_role_key text;
  v_job_id bigint;
  v_job_name constant text := 'healthos-escalation-notification-routing';
begin
  -- This function is intentionally callable only by its database owner
  -- from the trusted SQL Editor / migration context.
  select decrypted_secret into v_project_url
  from vault.decrypted_secrets
  where name = 'healthos_project_url'
  limit 1;

  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets
  where name = 'healthos_service_role_key'
  limit 1;

  if coalesce(v_project_url, '') = '' or coalesce(v_service_role_key, '') = '' then
    raise exception 'Required HealthOS scheduler secrets are missing from Supabase Vault';
  end if;

  if v_project_url !~ '^https://[a-z0-9-]+\.supabase\.co/?$' then
    raise exception 'HealthOS project URL in Vault is not a valid Supabase HTTPS project URL';
  end if;

  -- Replace an existing job with the same stable name; never create duplicates.
  for v_job_id in
    select jobid from cron.job where jobname = v_job_name
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  v_job_id := cron.schedule(
    v_job_name,
    '* * * * *',
    $job$
      select net.http_post(
        url := (
          select rtrim(decrypted_secret, '/') || '/rest/v1/rpc/enqueue_department_task_escalation_notifications'
          from vault.decrypted_secrets
          where name = 'healthos_project_url'
          limit 1
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'healthos_service_role_key' limit 1
          ),
          'Authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'healthos_service_role_key' limit 1
          )
        ),
        body := '{"p_clinic_id":null,"p_batch_limit":500}'::jsonb,
        timeout_milliseconds := 15000
      );
    $job$
  );

  return jsonb_build_object(
    'success', true,
    'job_name', v_job_name,
    'job_id', v_job_id,
    'schedule', '* * * * *',
    'batch_limit', 500,
    'secret_values_returned', false,
    'delivery_mode', 'trusted in-app notification routing'
  );
end;
$function$;

create or replace function public.healthos_unschedule_escalation_notification_router()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_job_id bigint;
  v_removed integer := 0;
begin
  for v_job_id in
    select jobid from cron.job
    where jobname = 'healthos-escalation-notification-routing'
  loop
    perform cron.unschedule(v_job_id);
    v_removed := v_removed + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'jobs_removed', v_removed,
    'job_name', 'healthos-escalation-notification-routing'
  );
end;
$function$;

revoke all on function public.healthos_schedule_escalation_notification_router() from public, anon, authenticated;
revoke all on function public.healthos_unschedule_escalation_notification_router() from public, anon, authenticated;

comment on function public.healthos_schedule_escalation_notification_router()
is 'Owner-only scheduler activation. Reads project URL and service-role key from Supabase Vault; schedules idempotent every-minute in-app escalation routing. Never returns secret values.';

comment on function public.healthos_unschedule_escalation_notification_router()
is 'Owner-only emergency stop for the HealthOS escalation notification routing cron job.';
