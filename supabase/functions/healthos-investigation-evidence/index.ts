import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "hospital-investigation-evidence";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const ALLOWED_ORIGINS = new Set([
  "https://healthos-ai-ay6k.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
]);

function cors(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://healthos-ai-ay6k.onrender.com",
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}
function safeName(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 180);
  return cleaned || "investigation-evidence";
}
function hex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(bytes: Uint8Array) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
function signatureMatches(mime: string, bytes: Uint8Array) {
  if (mime === "application/pdf") return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length >= 8 &&
    [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
  if (mime === "image/webp") return bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}
function isMissingStorageObject(error: unknown, objectPresent: boolean) {
  if (objectPresent) return false;
  if (!error) return true;
  const e = error as { statusCode?: string; status?: number; message?: string };
  return e?.statusCode === "404" || e?.status === 404 || /not found|object not found/i.test(e?.message || "");
}
function isCurrent(from?: string | null, to?: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  return (!from || from <= today) && (!to || to >= today);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Use POST." });

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json(req, 401, { error: "Sign in before accessing investigation evidence." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(req, 503, { error: "Evidence verification service is not configured on the server." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const user = authData.user;
    if (authError || !user) return json(req, 401, { error: "Your session is invalid. Sign in again." });

    const profileResult = await adminClient
      .from("staff_profiles")
      .select("id,clinic_id,user_id,employment_status")
      .eq("user_id", user.id)
      .eq("employment_status", "active");
    if (profileResult.error) return json(req, 503, { error: "Could not verify your active staff profile." });

    const profileByClinic = new Map<string, string>();
    for (const profile of profileResult.data || []) profileByClinic.set(profile.clinic_id, profile.id);

    const contentType = req.headers.get("Content-Type") || "";
    let action = "";
    let clinicId = "";
    let taskId = "";
    let evidenceId = "";
    let uploadFile: File | null = null;

    if (contentType.toLowerCase().includes("multipart/form-data")) {
      const form = await req.formData();
      action = String(form.get("action") || "upload");
      clinicId = String(form.get("clinic_id") || "").trim();
      taskId = String(form.get("task_id") || "").trim();
      const candidate = form.get("file");
      if (candidate instanceof File) uploadFile = candidate;
    } else {
      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { return json(req, 400, { error: "Invalid JSON request." }); }
      action = String(body.action || "");
      clinicId = String(body.clinic_id || "").trim();
      taskId = String(body.task_id || "").trim();
      evidenceId = String(body.evidence_id || "").trim();
    }

    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(clinicId)) return json(req, 400, { error: "A valid clinic_id is required." });

    const membershipResult = await adminClient
      .from("clinic_memberships")
      .select("role,status")
      .eq("clinic_id", clinicId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (membershipResult.error || !membershipResult.data) return json(req, 403, { error: "Active hospital membership is required." });
    const profileId = profileByClinic.get(clinicId) || null;

    if (action === "upload") {
      if (!uuid.test(taskId)) return json(req, 400, { error: "A valid task_id is required." });
      if (!profileId) return json(req, 403, { error: "Only an active assigned staff member may upload task evidence." });
      if (!(uploadFile instanceof File) || uploadFile.size < 1 || uploadFile.size > MAX_FILE_BYTES) {
        return json(req, 400, { error: "Choose a file between 1 byte and 15 MB." });
      }
      const mime = uploadFile.type.toLowerCase();
      if (!ALLOWED_MIME.has(mime)) return json(req, 415, { error: "Only PDF, JPEG, PNG and WEBP evidence files are accepted." });

      const { data: task, error: taskError } = await adminClient
        .from("staff_tasks")
        .select("id,clinic_id,assigned_to_assignment_id,task_status")
        .eq("clinic_id", clinicId)
        .eq("id", taskId)
        .maybeSingle();
      if (taskError || !task || ["submitted", "completed", "cancelled"].includes(task.task_status)) {
        return json(req, 409, { error: "This task is unavailable for new evidence." });
      }
      const { data: assignment, error: assignmentError } = await adminClient
        .from("staff_department_assignments")
        .select("id,staff_profile_id,assignment_status,effective_from,effective_to")
        .eq("clinic_id", clinicId)
        .eq("id", task.assigned_to_assignment_id)
        .maybeSingle();
      if (assignmentError || !assignment || assignment.staff_profile_id !== profileId ||
          assignment.assignment_status !== "active" || !isCurrent(assignment.effective_from, assignment.effective_to)) {
        return json(req, 403, { error: "Only the currently assigned staff member may attach evidence to this task." });
      }

      const bytes = new Uint8Array(await uploadFile.arrayBuffer());
      if (!signatureMatches(mime, bytes)) return json(req, 415, { error: "The file contents do not match the declared PDF or image type." });
      const digest = await sha256(bytes);
      const evidenceObjectId = crypto.randomUUID();
      const objectKey = `${clinicId}/${taskId}/${evidenceObjectId}`;
      const originalName = safeName(uploadFile.name);

      const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(objectKey, bytes, {
        contentType: mime,
        cacheControl: "0",
        upsert: false,
      });
      if (uploadError) {
        console.error("Investigation evidence storage upload failed.");
        return json(req, 503, { error: "The evidence file could not be stored securely." });
      }

      const { data: registeredId, error: registerError } = await adminClient.rpc(
        "register_staff_task_evidence_file",
        {
          p_clinic_id: clinicId,
          p_task_id: taskId,
          p_staff_profile_id: profileId,
          p_uploaded_by_user_id: user.id,
          p_storage_object_key: objectKey,
          p_original_sha256: digest,
          p_byte_size: bytes.byteLength,
          p_mime_type: mime,
          p_original_file_name: originalName,
        },
      );
      if (registerError || !registeredId) {
        await adminClient.storage.from(BUCKET).remove([objectKey]);
        console.error("Investigation evidence registration failed.");
        return json(req, 409, { error: "The upload could not be registered to this task. No evidence record was created." });
      }

      return json(req, 201, {
        success: true,
        evidence_id: registeredId,
        file_name: originalName,
        mime_type: mime,
        byte_size: bytes.byteLength,
        sha256_baseline_created: true,
        message: "Evidence uploaded and its original file fingerprint recorded.",
      });
    }

    if (!["verify", "retrieve"].includes(action)) return json(req, 400, { error: "Use upload, verify or retrieve." });
    if (!uuid.test(evidenceId) || !uuid.test(taskId)) return json(req, 400, { error: "Valid task_id and evidence_id are required." });

    const { data: fileRecord, error: fileError } = await adminClient
      .from("staff_task_evidence_file_integrity")
      .select("clinic_id,task_id,evidence_id,storage_bucket,storage_object_key,original_sha256,byte_size,mime_type,original_file_name,uploaded_by_staff_profile_id")
      .eq("clinic_id", clinicId)
      .eq("task_id", taskId)
      .eq("evidence_id", evidenceId)
      .maybeSingle();
    if (fileError || !fileRecord) return json(req, 404, { error: "The evidence file was not found in this hospital task." });

    // The user-scoped RPC is the authority for admin, appointed manager and assigned-staff scope.
    const { error: scopeError } = await userClient.rpc("get_hospital_investigation_file_integrity_audit", {
      p_clinic_id: clinicId,
      p_task_id: taskId,
    });
    if (scopeError) return json(req, 403, { error: "You are not authorised to verify or retrieve this investigation evidence." });

    const { data: profile } = await adminClient
      .from("staff_profiles")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("user_id", user.id)
      .eq("employment_status", "active")
      .maybeSingle();

    const { data: object, error: downloadError } = await adminClient.storage
      .from(fileRecord.storage_bucket)
      .download(fileRecord.storage_object_key);

    let verificationResult: "verified" | "hash_mismatch" | "file_missing" | "verification_error";
    let observedHash: string | null = null;
    let observedSize: number | null = null;
    let fileBytes: Uint8Array | null = null;
    let errorCode: string | null = null;

    if (downloadError || !object) {
      verificationResult = isMissingStorageObject(downloadError, Boolean(object)) ? "file_missing" : "verification_error";
      errorCode = verificationResult === "file_missing" ? "STORAGE_OBJECT_MISSING" : "STORAGE_READ_FAILED";
    } else {
      fileBytes = new Uint8Array(await object.arrayBuffer());
      observedSize = fileBytes.byteLength;
      observedHash = await sha256(fileBytes);
      verificationResult = observedHash === fileRecord.original_sha256 && observedSize === Number(fileRecord.byte_size)
        ? "verified" : "hash_mismatch";
      if (verificationResult === "hash_mismatch") errorCode = "ORIGINAL_FILE_FINGERPRINT_MISMATCH";
    }

    const { data: verification, error: verificationInsertError } = await adminClient
      .from("staff_task_evidence_file_verifications")
      .insert({
        clinic_id: clinicId,
        task_id: taskId,
        evidence_id: evidenceId,
        requested_by_user_id: user.id,
        requested_by_staff_profile_id: profile?.id || null,
        verification_result: verificationResult,
        original_sha256: fileRecord.original_sha256,
        observed_sha256: observedHash,
        original_byte_size: fileRecord.byte_size,
        observed_byte_size: observedSize,
        error_code: errorCode,
      })
      .select("id,verified_at")
      .single();
    if (verificationInsertError || !verification) {
      console.error("Evidence verification history could not be recorded.");
      return json(req, 503, { error: "Verification history could not be safely recorded. File retrieval has been blocked." });
    }

    const actionName = action === "retrieve" ? "file_retrieved" : "verification_requested";
    const accessOutcome = verificationResult === "verified" ? "verified" :
      verificationResult === "hash_mismatch" ? "hash_mismatch" :
      verificationResult === "file_missing" ? "file_missing" : "error";

    const { error: accessLogError } = await adminClient.from("staff_task_evidence_file_access_log").insert({
      clinic_id: clinicId,
      task_id: taskId,
      evidence_id: evidenceId,
      accessed_by_user_id: user.id,
      accessed_by_staff_profile_id: profile?.id || null,
      action: actionName,
      outcome: accessOutcome,
      verification_id: verification.id,
    });
    if (accessLogError) {
      console.error("Evidence access audit could not be recorded.");
      return json(req, 503, { error: "Access history could not be safely recorded. File retrieval has been blocked." });
    }

    if (verificationResult === "hash_mismatch" || verificationResult === "file_missing") {
      const { data: existingAlert, error: alertLookupError } = await adminClient
        .from("staff_task_evidence_file_tamper_alerts")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("task_id", taskId)
        .eq("evidence_id", evidenceId)
        .eq("alert_status", "open")
        .limit(1)
        .maybeSingle();
      if (alertLookupError) {
        console.error("Evidence tamper alert lookup failed.");
        return json(req, 503, { error: "Tamper alert status could not be confirmed. File retrieval has been blocked." });
      }
      if (!existingAlert) {
        const { error: alertInsertError } = await adminClient.from("staff_task_evidence_file_tamper_alerts").insert({
          clinic_id: clinicId,
          task_id: taskId,
          evidence_id: evidenceId,
          verification_id: verification.id,
          alert_type: verificationResult === "hash_mismatch" ? "uploaded_file_hash_mismatch" : "uploaded_file_missing",
          severity: "critical",
          alert_status: "open",
        });
        if (alertInsertError) {
          console.error("Evidence tamper alert could not be persisted.");
          return json(req, 503, { error: "Tamper alert could not be safely recorded. File retrieval has been blocked." });
        }
      }
    }

    if (verificationResult !== "verified" || !fileBytes) {
      const status = verificationResult === "verification_error" ? 503 : 409;
      return json(req, status, {
        success: false,
        verification_result: verificationResult,
        verification_id: verification.id,
        retrieval_blocked: action === "retrieve",
        alert_created: verificationResult === "hash_mismatch" || verificationResult === "file_missing",
        message: verificationResult === "hash_mismatch"
          ? "The stored file does not match its original fingerprint. Retrieval has been blocked and a tamper alert was created."
          : verificationResult === "file_missing"
          ? "The original evidence file is missing. Retrieval has been blocked and an alert was created."
          : "The file could not be independently verified. Retrieval remains blocked.",
      });
    }

    if (action === "verify") {
      return json(req, 200, {
        success: true,
        verification_result: "verified",
        verification_id: verification.id,
        verified_at: verification.verified_at,
        file_name: fileRecord.original_file_name,
        byte_size: observedSize,
        sha256_match: true,
      });
    }

    const headers = {
      ...cors(req),
      "Content-Type": fileRecord.mime_type,
      "Content-Length": String(fileBytes.byteLength),
      "Content-Disposition": `attachment; filename="${safeName(fileRecord.original_file_name)}"`,
      "X-Content-Type-Options": "nosniff",
    };
    return new Response(fileBytes, { status: 200, headers });
  } catch (error) {
    console.error("Investigation evidence verifier failed:", error instanceof Error ? error.message : "unknown");
    return json(req, 500, { error: "The secure evidence operation failed. No unverified file was returned." });
  }
});
