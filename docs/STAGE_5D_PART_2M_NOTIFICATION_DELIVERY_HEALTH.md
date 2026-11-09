# Stage 5D Part 2M — Escalation Delivery Reliability & Incident Monitoring

## Purpose
This stage adds a read-only, administrator-scoped database report for the existing escalation notification outbox and the optional Part 2L scheduler.

It deliberately does not:
- resend or modify any notification;
- mark a notification as read;
- create external email, SMS, or WhatsApp delivery;
- expose HTTP request headers, tokens, response bodies, or patient data;
- claim that a notification has been read merely because it is in the inbox.

## Existing behavior verified before this stage
- The existing outbox only allows the `in_app` channel.
- Its delivery statuses are `pending`, `delivered`, and `failed`.
- The routing RPC inserts idempotent rows with status `delivered`; in this design that means available in the secure in-app inbox.
- `attempt_count` is set during routing and is not a count of external provider retries.
- The live notification table currently contains zero rows.
- The live database currently has Vault only among `pg_cron`, `pg_net`, and Vault. Cron and pg_net are not installed, so the Part 2L scheduler is not active.

## Migration
Apply `20261109180000_stage_5d_part_2m_notification_delivery_health.sql` only after the preceding Part 2L migration has been reviewed and the full migration chain has been tested in a clean staging project.

The new RPC is:
`public.get_escalation_notification_delivery_health(p_clinic_id uuid, p_limit integer default 20)`

It is read-only and checks active clinic owner/admin membership on the server. It reports:
- pending, failed, delivered-to-in-app-inbox, read and unread counts;
- oldest pending age and maximum recorded attempt count;
- whether pg_cron/pg_net and their catalogs are available;
- the named Part 2L cron job and recent job run outcomes, when cron is installed;
- recent pg_net HTTP failures in the last 24 hours, when pg_net is installed.

The function does not make optional cron/net catalogs a migration-time dependency. When those extensions are absent, it reports that they are unavailable.

## Verification after staging
1. Apply migrations in chronological order in a clean staging database.
2. Verify the function exists and only authenticated users can execute it; anon/public cannot.
3. Test with an active owner/admin and confirm the JSON report is returned.
4. Test with a regular staff member and confirm access is denied.
5. Confirm the report is read-only by comparing notification rows before and after.
6. If and only if Part 2L is intentionally activated, verify cron job runs and pg_net HTTP responses separately. A successful HTTP 2xx only proves the routing RPC endpoint responded; then verify recipient inbox rows and deduplication.
7. Do not enable external channels until a provider, secure credentials, retry policy, consent rules and delivery receipts have been designed and verified.

## Operational interpretation
- Pending rows older than the agreed service target indicate backlog.
- Failed rows indicate a recorded routing/delivery failure according to the outbox's current semantics.
- Delivered-to-in-app-inbox means the item is available to the user; it does not mean read.
- Cron job run failures and pg_net HTTP failures are infrastructure incidents, separate from notification read state.
