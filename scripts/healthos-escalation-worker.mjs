#!/usr/bin/env node
/**
 * HealthOS department escalation worker.
 *
 * Required environment:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Runs the idempotent task escalation scan, then routes newly active
 * escalations into recipients' in-app inboxes. No patient data is logged.
 * Designed for a scheduled Render Cron Job (Node.js 18+).
 */

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const batchLimit = Number.parseInt(process.env.HEALTHOS_ESCALATION_BATCH_LIMIT || "500", 10);
const clinicId = (process.env.HEALTHOS_CLINIC_ID || "").trim();

function log(event, details = {}) {
  process.stdout.write(JSON.stringify({
    service: "healthos-department-escalation-worker",
    event,
    timestamp: new Date().toISOString(),
    ...details
  }) + "\n");
}

if (!supabaseUrl || !/^https:\/\//i.test(supabaseUrl)) {
  log("configuration_error", { message: "SUPABASE_URL must be a valid HTTPS URL." });
  process.exit(1);
}
if (!serviceKey) {
  log("configuration_error", { message: "SUPABASE_SERVICE_ROLE_KEY is required; configure it as a secret in Render." });
  process.exit(1);
}
if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 2000) {
  log("configuration_error", { message: "HEALTHOS_ESCALATION_BATCH_LIMIT must be an integer from 1 to 2000." });
  process.exit(1);
}
if (clinicId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)) {
  log("configuration_error", { message: "HEALTHOS_CLINIC_ID must be a UUID when supplied." });
  process.exit(1);
}

async function callRpc(name, args) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      },
      body: JSON.stringify(args),
      signal: controller.signal
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`${name} returned HTTP ${response.status}: ${body.slice(0, 1200)}`);
    }
    try { return body ? JSON.parse(body) : {}; }
    catch { throw new Error(`${name} returned an unreadable response.`); }
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const scope = clinicId || null;
  log("run_started", { scope: scope ? "single_clinic" : "all_authorised_clinics", batch_limit: batchLimit });

  // Step 1: create missing overdue/blocked escalation records.
  const scan = await callRpc("process_department_task_escalations", {
    p_clinic_id: scope,
    p_batch_limit: batchLimit
  });
  log("escalation_scan_completed", {
    tasks_scanned: scan.tasks_scanned ?? null,
    new_escalations_created: scan.new_escalations_created ?? null,
    duplicate_active_escalations_prevented: scan.duplicate_active_escalations_prevented ?? null
  });

  // Step 2: route open/acknowledged escalations to current authorised recipients.
  const routing = await callRpc("enqueue_department_task_escalation_notifications", {
    p_clinic_id: scope,
    p_batch_limit: batchLimit
  });
  log("notification_routing_completed", {
    active_escalations_scanned: routing.active_escalations_scanned ?? null,
    notifications_created: routing.notifications_created ?? null,
    duplicate_notifications_prevented: routing.duplicate_notifications_prevented ?? true
  });

  log("run_succeeded");
}

main().catch((error) => {
  log("run_failed", { message: String(error?.message || error).slice(0, 1500) });
  process.exitCode = 1;
});
