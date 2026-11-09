import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth) return reply({ error: "Sign in is required." }, 401);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const dailyKey = Deno.env.get("DAILY_API_KEY") ?? "";
  const dailyDomain = (Deno.env.get("DAILY_DOMAIN") ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const hipaaEnabled = Deno.env.get("DAILY_HIPAA_ENABLED") === "true";
  if (!url || !anon || !serviceKey) return reply({ error: "Server authentication configuration is incomplete." }, 500);
  if (!dailyKey || !dailyDomain || !hipaaEnabled) {
    return reply({ error: "Video provider is not enabled. Configure a Daily domain and API key, and confirm the Healthcare add-on and signed BAA before enabling patient consultations." }, 503);
  }

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return reply({ error: "Your sign-in session is invalid or expired." }, 401);

  try {
    const body = await req.json();
    let sessionId = typeof body.session_id === "string" ? body.session_id : "";
    if (typeof body.request_id === "string" && body.request_id) {
      const { data, error } = await userClient.rpc("healthos_create_telemedicine_session", { p_request_id: body.request_id });
      if (error) return reply({ error: error.message }, 403);
      sessionId = data?.id || "";
    }
    if (!sessionId) return reply({ error: "A valid session_id or accepted request_id is required." }, 400);

    const { data: session, error: sessionError } = await adminClient
      .from("healthos_telemedicine_sessions")
      .select("id,clinic_id,department_id,patient_user_id,session_status,provider_key,provider_meeting_reference,scheduled_at")
      .eq("id", sessionId).maybeSingle();
    if (sessionError || !session) return reply({ error: "Consultation session not found." }, 404);

    const isPatient = session.patient_user_id === userData.user.id;
    if (!isPatient) {
      const { error: accessError } = await userClient.rpc("healthos_get_telemedicine_workspace", { p_session_id: sessionId });
      if (accessError) return reply({ error: "You are not authorised for this consultation." }, 403);
    }
    if (["completed", "cancelled", "expired"].includes(session.session_status)) {
      return reply({ error: "This consultation has been closed." }, 409);
    }

    const { data: consent, error: consentError } = await adminClient
      .from("healthos_telemedicine_consents")
      .select("id,consent_status,revoked_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (consentError || !consent || consent.consent_status !== "granted" || consent.revoked_at) {
      return reply({ error: "The patient must grant and maintain telemedicine consent before a call can be joined." }, 409);
    }

    let roomName = session.provider_meeting_reference;
    if (session.provider_key !== "daily" || !roomName) {
      roomName = "h-" + crypto.randomUUID().replaceAll("-", "");
      const scheduled = new Date(session.scheduled_at).getTime();
      const now = Date.now();
      const roomExpiry = Math.floor(Math.max(now + 60 * 60 * 1000, scheduled + 2 * 60 * 60 * 1000) / 1000);
      const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: { Authorization: "Bearer " + dailyKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
          properties: {
            exp: roomExpiry,
            start_audio_off: true,
            start_video_off: true,
            enable_recording: false,
            enable_screenshare: false,
            max_participants: 2
          }
        })
      });
      const room = await roomResponse.json();
      if (!roomResponse.ok) return reply({ error: "Video room provider could not prepare the private room." }, 502);
      const { error: updateError } = await adminClient.from("healthos_telemedicine_sessions")
        .update({ provider_key: "daily", provider_meeting_reference: room.name, session_status: "ready", updated_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (updateError) return reply({ error: "Private room was created but the hospital session could not be updated. Contact the administrator." }, 500);
    }

    const tokenExpiry = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: { Authorization: "Bearer " + dailyKey, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: {
        room_name: roomName,
        exp: tokenExpiry,
        user_name: isPatient ? "Patient" : "Authorised clinician",
        is_owner: !isPatient,
        start_audio_off: true,
        start_video_off: true,
        eject_at_token_exp: true
      }})
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.token) return reply({ error: "A secure meeting token could not be issued." }, 502);
    return reply({
      success: true,
      session_id: sessionId,
      provider: "daily",
      session_status: "ready",
      join_url: "https://" + dailyDomain + "/" + roomName + "?t=" + encodeURIComponent(tokenData.token),
      expires_at: new Date(tokenExpiry * 1000).toISOString(),
      recording_enabled: false
    });
  } catch (error) {
    console.error("Telemedicine provider preparation failed", error);
    return reply({ error: "The consultation could not be prepared. Please retry or contact the hospital administrator." }, 500);
  }
});
