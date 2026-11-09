# Stage 5D Part 2L — Escalation notification scheduler

## What this adds

The migration prepares Supabase Cron + pg_net scheduling for the existing
service-role-only RPC:

`public.enqueue_department_task_escalation_notifications(uuid, integer)`

The scheduled job runs once per minute, routes up to 500 active escalation
records per run, and relies on the existing unique deduplication key to prevent
duplicate in-app notifications.

It does not send email, SMS or WhatsApp. It does not change task or escalation
status. It does not expose the service-role key to the browser.

## Deployment order

1. Apply all required earlier notification/escalation migrations in timestamp
   order, including:
   - `20261108110258_department_task_notification_outbox_foundation.sql`
   - `20261108110500_secure_department_escalation_inbox_and_acknowledgement.sql`
   - `20261108112017_automatic_department_escalation_notification_routing.sql`
   - Stage 5D Parts 2A–2J migrations.
2. Apply `20261109170000_stage_5d_part_2l_escalation_notification_scheduler.sql`.
3. In Supabase Dashboard → SQL Editor, store the two secrets in Vault. Replace
   both placeholders locally; never commit actual secret values to GitHub:

```sql
select vault.create_secret(
  'https://YOUR_PROJECT_REF.supabase.co',
  'healthos_project_url'
);

select vault.create_secret(
  'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  'healthos_service_role_key'
);
```

If a secret name already exists, update/rotate that Vault secret using the
Vault dashboard or the supported Vault secret-management workflow; do not
create multiple competing names.

4. Activate the job from the SQL Editor:

```sql
select public.healthos_schedule_escalation_notification_router();
```

This function is intentionally not executable by public, anon or authenticated
API clients. Run it as the trusted database owner in the SQL Editor.

## Verify the scheduler

```sql
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'healthos-escalation-notification-routing';
```

Check recent runs:

```sql
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (
  select jobid from cron.job
  where jobname = 'healthos-escalation-notification-routing'
)
order by start_time desc
limit 20;
```

Check asynchronous HTTP responses (the request IDs are produced by pg_net):

```sql
select id, status_code, timed_out, error_msg, created
from net._http_response
order by created desc
limit 20;
```

A successful scheduler run only proves that the scheduled SQL executed. Confirm
the corresponding HTTP response is 2xx and that eligible notifications appear
in recipient inboxes before declaring end-to-end delivery verified.

## Emergency stop

```sql
select public.healthos_unschedule_escalation_notification_router();
```

## Security notes

- The service-role key is stored only in Supabase Vault and is used only by the
  database scheduler to call the existing privileged RPC.
- Never put the service-role key in `app.js`, `index.html`, `styles.css`,
  Render public environment variables, or any browser bundle.
- Notification routing remains in-app only and contains no patient identifiers.
- The schedule can be safely reactivated; the helper replaces any existing job
  with the same stable name.
- Do not activate until the earlier migrations and Vault secrets are confirmed.
