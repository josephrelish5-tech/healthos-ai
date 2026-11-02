import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  "https://healthos-ai-ay6k.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
]);

function headersFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://healthos-ai-ay6k.onrender.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
}

function respond(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: headersFor(req) });
}

function isCurrent(record: { effective_from?: string; effective_to?: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  return (!record.effective_from || record.effective_from <= today) &&
    (!record.effective_to || record.effective_to >= today);
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headersFor(req) });
  if (req.method !== "POST") return respond(req, 405, { error: "Use POST for secure transcription." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return respond(req, 401, { error: "Sign in before using the Medical Scribe." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(req, 503, { error: "Secure Medical Scribe is not configured on the server." });
  }

  const baseUrl = Deno.env.get("SCRIBE_AI_BASE_URL") || "";
  const apiKey = Deno.env.get("SCRIBE_AI_API_KEY") || "";
  const transcriptionModel = Deno.env.get("SCRIBE_TRANSCRIPTION_MODEL") || "";
  const noteModel = Deno.env.get("SCRIBE_NOTE_MODEL") || "";
  if (!baseUrl || !apiKey || !transcriptionModel || !noteModel) {
    return respond(req, 503, {
      error: "The clinic has not configured an approved transcription and note-generation provider. No audio was processed.",
    });
  }

  let providerBase: URL;
  try {
    providerBase = new URL(baseUrl);
    if (providerBase.protocol !== "https:" || providerBase.username || providerBase.password) {
      return respond(req, 503, { error: "The configured AI provider endpoint is invalid. Use a trusted HTTPS endpoint." });
    }
  } catch {
    return respond(req, 503, { error: "The configured AI provider endpoint is invalid." });
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
    const requester = authData.user;
    if (authError || !requester) return respond(req, 401, { error: "Your session is invalid. Sign in again." });

    const form = await req.formData();
    const clinicId = String(form.get("clinic_id") || "").trim();
    const encounterId = String(form.get("encounter_id") || "").trim();
    const consent = form.get("consent_confirmed") === "true";
    const audioConsent = form.get("audio_processing_consent") === "true";
    const noteType = String(form.get("note_type") || "progress");
    const audio = form.get("audio");

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clinicId) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(encounterId)) {
      return respond(req, 400, { error: "Select a valid clinic and open encounter." });
    }
    if (!consent || !audioConsent) {
      return respond(req, 400, { error: "Both clinical documentation consent and explicit audio-processing consent are required." });
    }
    if (!["history", "examination", "assessment", "plan", "progress", "discharge"].includes(noteType)) {
      return respond(req, 400, { error: "Select a valid clinical note section." });
    }
    if (!(audio instanceof File) || audio.size < 1 || audio.size > MAX_AUDIO_BYTES || !audio.type.startsWith("audio/")) {
      return respond(req, 400, { error: "Choose a supported audio file up to 20 MB." });
    }

    const { data: membership, error: membershipError } = await adminClient
      .from("clinic_memberships")
      .select("role,status")
      .eq("clinic_id", clinicId)
      .eq("user_id", requester.id)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError || !membership) return respond(req, 403, { error: "You do not have active access to this clinic." });

    const { data: encounter, error: encounterError } = await adminClient
      .from("clinical_encounters")
      .select("id,clinic_id,patient_id,clinician_id,status")
      .eq("clinic_id", clinicId)
      .eq("id", encounterId)
      .eq("clinician_id", requester.id)
      .in("status", ["open", "in_progress"])
      .maybeSingle();
    if (encounterError || !encounter) {
      return respond(req, 403, { error: "Choose an open encounter assigned to your account." });
    }

    let canCreate = ["owner", "admin"].includes(membership.role);
    if (!canCreate) {
      const { data: assignments, error: assignmentError } = await adminClient
        .from("staff_department_assignments")
        .select("id,assignment_status,effective_from,effective_to,staff_profiles!inner(user_id,employment_status),clinic_departments!inner(department_name,is_active),staff_assignment_roles!inner(is_active,effective_from,effective_to,clinic_professional_roles!inner(role_code,is_active))")
        .eq("clinic_id", clinicId)
        .eq("staff_profiles.user_id", requester.id)
        .eq("staff_profiles.employment_status", "active")
        .eq("assignment_status", "active")
        .eq("clinic_departments.is_active", true)
        .eq("staff_assignment_roles.is_active", true)
        .eq("staff_assignment_roles.clinic_professional_roles.is_active", true);
      if (assignmentError) {
        console.error("Medical Scribe permission lookup failed.");
        return respond(req, 403, { error: "Could not verify your clinical documentation permissions." });
      }

      const { data: permissions, error: permissionError } = await adminClient
        .from("clinic_role_permissions")
        .select("department,professional_role_key,allowed")
        .eq("clinic_id", clinicId)
        .eq("role_key", membership.role)
        .eq("resource_key", "clinical_records")
        .eq("action_key", "create");
      if (permissionError) return respond(req, 403, { error: "Could not verify your clinical documentation permissions." });

      for (const assignment of assignments || []) {
        if (assignment.assignment_status !== "active" || !isCurrent(assignment)) continue;
        const department = relationOne(assignment.clinic_departments);
        if (!department?.is_active) continue;
        const roleRows = Array.isArray(assignment.staff_assignment_roles)
          ? assignment.staff_assignment_roles : [assignment.staff_assignment_roles];
        for (const roleRow of roleRows) {
          if (!roleRow || !roleRow.is_active || !isCurrent(roleRow)) continue;
          const professionalRole = relationOne(roleRow.clinic_professional_roles);
          if (!professionalRole?.is_active) continue;
          const matching = (permissions || []).filter((p: { department: string | null; professional_role_key: string | null }) =>
            (p.department || "").trim().toLowerCase() === department.department_name.trim().toLowerCase() &&
            (p.professional_role_key || "").trim().toLowerCase() === professionalRole.role_code.trim().toLowerCase()
          );
          if (matching.some((p: { allowed: boolean }) => p.allowed) &&
              !matching.some((p: { allowed: boolean }) => !p.allowed)) canCreate = true;
        }
      }
    }
    if (!canCreate) return respond(req, 403, { error: "Your assigned clinical role does not have permission to create Medical Scribe drafts." });

    const safeName = audio.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "consultation-audio";
    const transcriptionForm = new FormData();
    transcriptionForm.append("file", audio, safeName);
    transcriptionForm.append("model", transcriptionModel);

    const transcriptionResponse = await fetch(new URL("audio/transcriptions", providerBase.toString().replace(/\/?$/, "/")), {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey },
      body: transcriptionForm,
      signal: AbortSignal.timeout(90000),
    });
    if (!transcriptionResponse.ok) {
      console.error("Configured transcription provider returned an unsuccessful response.");
      return respond(req, 502, { error: "The configured transcription provider could not process this audio. No draft was saved." });
    }
    const transcriptionPayload = await transcriptionResponse.json();
    const transcript = String(transcriptionPayload.text || "").trim();
    if (!transcript || transcript.length > 20000) {
      return respond(req, 502, { error: "The transcription was empty or exceeded the supported length. No draft was saved." });
    }

    const notePrompt = [
      "Prepare a draft clinical note from the transcript below for a qualified clinician to review.",
      "Use only facts explicitly present in the transcript. Do not infer, diagnose, prescribe, recommend treatment, or invent missing details.",
      "Preserve uncertainty. Mark absent information as 'Not stated'. Do not convert unclear speech into a confident clinical fact.",
      "Use a structured clinical documentation format. For progress notes, use SOAP headings: Subjective, Objective, Assessment, Plan. For history, use Presenting concern, History of present illness, Relevant history, Medications, Allergies. For examination, use Examination findings and Observations. For assessment, use Clinician-stated assessment and Uncertainties. For plan, use Clinician-stated plan and Follow-up. For discharge, use Discharge condition, Clinician-stated instructions, Medication reconciliation and Follow-up.",
      "Only place information under a heading when it is explicitly present in the transcript. Mark missing items as 'Not stated' and unclear audio as 'Verify'. Never create a diagnosis, differential, prescription, dose, investigation, referral or treatment recommendation.",
      "Keep medication names, doses, dates, measurements and negations exactly as stated; if unclear, flag for verification. Preserve who said each important fact when relevant.",
      "Return only the draft note text. This is an unsigned draft, not medical advice or a final clinical record.",
      "Requested note section: " + noteType,
      "Consultation transcript:\n" + transcript,
    ].join("\n\n");

    const noteResponse = await fetch(new URL("chat/completions", providerBase.toString().replace(/\/?$/, "/")), {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: noteModel,
        temperature: 0.1,
        messages: [
          { role: "system", content: "You are a clinical documentation drafting assistant. You do not diagnose, prescribe, or make autonomous care decisions. Never fabricate clinical facts." },
          { role: "user", content: notePrompt },
        ],
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!noteResponse.ok) {
      console.error("Configured note-generation provider returned an unsuccessful response.");
      return respond(req, 502, { error: "Transcription completed, but the note-drafting service failed. You may use the transcript and enter the note manually." });
    }
    const notePayload = await noteResponse.json();
    const draftNote = String(notePayload.choices?.[0]?.message?.content || "").trim();
    if (!draftNote || draftNote.length > 20000) {
      return respond(req, 502, { error: "The note-drafting service returned an invalid draft. Review the transcript and enter the note manually." });
    }

    // Audio and generated text are not persisted here. The clinician edits the
    // returned draft in the browser and explicitly saves it through the existing RLS-protected workflow.
    return respond(req, 200, { transcript, draft_note: draftNote, note_type: noteType, requires_clinician_review: true });
  } catch (error) {
    console.error("Secure Medical Scribe request failed:", error instanceof Error ? error.name : "unknown");
    return respond(req, 500, { error: "The Medical Scribe request could not be completed. No audio is stored by HealthOS AI." });
  }
});