# HealthOS department escalation worker

This worker is intended to run as a scheduled Render Cron Job. It calls two
existing Supabase RPCs in sequence:

1. `process_department_task_escalations` — creates missing overdue/blocked
   escalation records.
2. `enqueue_department_task_escalation_notifications` — routes active
   escalations to current, authorised in-app recipients.

## Runtime

- Node.js 18 or newer (uses built-in `fetch`; no npm dependencies).
- Command: `node scripts/healthos-escalation-worker.mjs`
- Build command: `echo "No build step required"`

## Required Render secrets

Set these in the Cron Job's Environment page. Do not commit their values:

- `SUPABASE_URL`: the HTTPS URL of the existing HealthOS Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role key. Keep this
  server-side only; never expose it in browser JavaScript or GitHub.

Optional:

- `HEALTHOS_ESCALATION_BATCH_LIMIT`: integer 1–2000; defaults to 500.
- `HEALTHOS_CLINIC_ID`: optional clinic UUID. Leave unset only when the
  trusted worker is intentionally authorised to scan all clinics in this
  Supabase project.

## Suggested schedule

Every 5 minutes: `*/5 * * * *` (Render cron uses UTC).

## Safety and operational notes

- The worker never reads or logs patient records or task descriptions.
- Both RPC calls are idempotent; duplicate active escalations and duplicate
  recipient notifications are prevented by database constraints.
- In-app notifications are immediately visible in the secure HealthOS inbox.
  This worker does not send email, SMS, or WhatsApp messages.
- A non-zero exit code makes failed runs visible in Render job history/logs.
- Do not configure the worker until the service-role key has been added as a
  secret in Render. Never put the key in source code, a committed file, or
  frontend environment variables.
- The static HealthOS web service is not modified by this worker.
