import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST required." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return reply({ error: "Sign in is required." }, 401);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const dailyKey = Deno.env.get("DAILY_API_KEY") ?? "";
  if (!url || !anonKey || !serviceKey) {
    return reply({ error: "Server authentication configuration is incomplete." }, 500);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false }
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return reply({ error: "Your sign-in session is invalid or expired." }, 401);
  }

  try {
    const body = await req.json();
    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    if (!sessionId) return reply({ error: "A valid session_id is required." }, 400);

    // Read the session before recording withdrawal so only its actual patient
    // can invoke this endpoint. The consent RPC repeats this check server-side.
    const { data: session, error: sessionError } = await adminClient
      .from("healthos_telemedicine_sessions")
      .select("id,patient_user_id,session_status,provider_key,provider_meeting_reference")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) return reply({ error: "Consultation session not found." }, 404);
    if (session.patient_user_id !== authData.user.id) {
      return reply({ error: "Only the patient assigned to this consultation can withdraw consent." }, 403);
    }

    const { data: consentResult, error: consentError } = await userClient.rpc(
      "healthos_patient_telemedicine_consent",
      { p_session_id: sessionId, p_grant: false }
    );
    if (consentError) return reply({ error: consentError.message }, 409);

    let roomTermination = "not_required";
    if (session.provider_key === "daily" && session.provider_meeting_reference) {
      if (!dailyKey) {
        roomTermination = "pending_provider_configuration";
        console.error("Telemedicine consent revoked but Daily room termination key is unavailable", {
          session_id: sessionId
        });
        return reply({
          success: true,
          consent_status: "revoked",
          room_termination: roomTermination,
          message: "Consent withdrawal was recorded. The existing video room could not be terminated because provider termination credentials are unavailable. Contact the hospital immediately."
        }, 202);
      }

      const deleteResponse = await fetch(
        "https://api.daily.co/v1/rooms/" + encodeURIComponent(session.provider_meeting_reference),
        { method: "DELETE", headers: { Authorization: "Bearer " + dailyKey } }
      );

      // Daily may report that the room is already absent. That state is safe:
      // there is no active room left to join.
      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const providerMessage = await deleteResponse.text().catch(() => "");
        console.error("Daily room termination failed after consent withdrawal", {
          session_id: sessionId,
          provider_status: deleteResponse.status,
          provider_message: providerMessage.slice(0, 500)
        });
        return reply({
          success: true,
          consent_status: "revoked",
          room_termination: "failed_retry_required",
          message: "Consent withdrawal was recorded, and new meeting tokens are blocked. The existing video room could not be confirmed terminated. Contact the hospital immediately and retry room termination."
        }, 202);
      }

      roomTermination = "terminated";
      const { error: resetError } = await adminClient
        .from("healthos_telemedicine_sessions")
        .update({
          provider_key: "unconfigured",
          provider_meeting_reference: null,
          session_status: ["ready", "active"].includes(session.session_status)
            ? "awaiting_provider"
            : session.session_status,
          updated_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (resetError) {
        console.error("Daily room terminated but session provider reference reset failed", {
          session_id: sessionId,
          error: resetError.message
        });
        return reply({
          success: true,
          consent_status: "revoked",
          room_termination: "terminated_session_reset_pending",
          message: "Consent withdrawal was recorded and the video room was terminated. The hospital session record needs administrator review before another room can be prepared."
        }, 202);
      }
    }

    return reply({
      success: true,
      consent_status: "revoked",
      room_termination: roomTermination,
      session_id: sessionId,
      recorded_at: consentResult?.recorded_at ?? new Date().toISOString()
    });
  } catch (error) {
    console.error("Telemedicine consent withdrawal failed", error);
    return reply({ error: "Consent withdrawal could not be completed. Contact the hospital if a call is in progress." }, 500);
  }
});
