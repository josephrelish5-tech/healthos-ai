import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ROOM_NAME = "xZO3M6Da0UjiqtvDdRqY";
const EXPECTED_DOMAIN = "healthos-team.daily.co";
const TOKEN_LIFETIME_SECONDS = 15 * 60;
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const dailyKey = Deno.env.get("DAILY_API_KEY") ?? "";
  const dailyDomain = (Deno.env.get("DAILY_DOMAIN") ?? "")
    .replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return reply({ error: "Server authentication configuration is incomplete." }, 500);
  }
  if (!dailyKey || dailyDomain !== EXPECTED_DOMAIN) {
    return reply({ error: "The configured Daily domain is not authorised for this demonstration." }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false }
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return reply({ error: "Your sign-in session is invalid or expired." }, 401);

  try {
    const body = await req.json();
    const clinicId = typeof body.clinic_id === "string" ? body.clinic_id : "";
    const requestedRoom = typeof body.room_name === "string" ? body.room_name : "";
    if (!clinicId || requestedRoom !== ROOM_NAME) {
      return reply({ error: "Only the registered synthetic demonstration room is supported." }, 400);
    }

    const { data: clinicOwner } = await adminClient
      .from("clinics").select("id")
      .eq("id", clinicId).eq("owner_user_id", authData.user.id).maybeSingle();

    let authorised = Boolean(clinicOwner);
    if (!authorised) {
      const { data: membership } = await adminClient
        .from("clinic_memberships").select("id")
        .eq("clinic_id", clinicId)
        .eq("user_id", authData.user.id)
        .eq("status", "active")
        .in("role", ["owner", "admin"])
        .maybeSingle();
      authorised = Boolean(membership);
    }
    if (!authorised) return reply({ error: "Only an active clinic owner or administrator can create demonstration access." }, 403);

    const roomResponse = await fetch(
      "https://api.daily.co/v1/rooms/" + encodeURIComponent(ROOM_NAME),
      { headers: { Authorization: "Bearer " + dailyKey } }
    );
    const room = await roomResponse.json();
    if (!roomResponse.ok) return reply({ error: "Daily could not verify the demonstration room." }, 502);
    if (room.name !== ROOM_NAME || room.privacy !== "private" || room.config?.max_participants !== 2) {
      return reply({ error: "Room security check failed. Expected the registered private room with a two-person limit." }, 409);
    }
    if (room.config?.enable_recording === true || room.config?.enable_recording === "cloud") {
      return reply({ error: "Recording must remain disabled for this synthetic demonstration." }, 409);
    }

    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS;
    const roomUrl = "https://" + EXPECTED_DOMAIN + "/" + ROOM_NAME;

    async function issueToken(userName: string, isOwner: boolean) {
      const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + dailyKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            room_name: ROOM_NAME,
            exp: expiresAt,
            eject_at_token_exp: true,
            user_name: userName,
            user_id: crypto.randomUUID(),
            is_owner: isOwner
          }
        })
      });
      const result = await response.json();
      if (!response.ok || typeof result.token !== "string") {
        throw new Error("Daily could not issue both demonstration meeting tokens.");
      }
      return result.token as string;
    }

    const [doctorToken, patientToken] = await Promise.all([
      issueToken("Dr Demo (Fictional)", true),
      issueToken("Patient Demo (Fictional)", false)
    ]);

    console.info("Synthetic telemedicine demo tokens issued", {
      actor_user_id: authData.user.id,
      clinic_id: clinicId,
      room_name: ROOM_NAME,
      expires_at: new Date(expiresAt * 1000).toISOString()
    });

    return reply({
      success: true,
      synthetic_only: true,
      room_name: ROOM_NAME,
      room_url: roomUrl,
      doctor_join_url: roomUrl + "?t=" + encodeURIComponent(doctorToken),
      patient_join_url: roomUrl + "?t=" + encodeURIComponent(patientToken),
      expires_at: new Date(expiresAt * 1000).toISOString(),
      recording_enabled: false,
      max_participants: 2
    });
  } catch (error) {
    console.error("Synthetic telemedicine demo access failed", error);
    return reply({ error: error instanceof Error ? error.message : "Could not create demonstration access." }, 500);
  }
});
