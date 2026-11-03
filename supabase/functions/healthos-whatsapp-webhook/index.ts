// HealthOS AI — Meta WhatsApp Cloud API webhook
// Required Supabase Edge Function secrets:
// META_APP_SECRET, META_VERIFY_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
// WHATSAPP_CLINIC_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// This endpoint only records inbound text enquiries. It never diagnoses,
// assigns clinical urgency, or treats an inbound message as consent.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

function response(body: string, status = 200, contentType = "text/plain") {
  return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": contentType } });
}

function hex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return hex(new Uint8Array(digest)) === signature.slice(7).toLowerCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const verifyToken = Deno.env.get("META_VERIFY_TOKEN") || "";
  const appSecret = Deno.env.get("META_APP_SECRET") || "";
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
  const clinicId = Deno.env.get("WHATSAPP_CLINIC_ID") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === verifyToken && challenge) return response(challenge);
    return response("Webhook verification failed", 403);
  }

  if (req.method !== "POST") return response("Method not allowed", 405);
  if (!appSecret || !verifyToken || !phoneNumberId || !clinicId || !supabaseUrl || !serviceKey) {
    return response("Webhook configuration incomplete", 503, "application/json");
  }

  const rawBody = await req.text();
  if (!(await verifySignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret))) {
    return response("Invalid webhook signature", 401);
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return response("Invalid JSON", 400); }

  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const dbHeaders = {
    "apikey": serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
  };

  for (const entry of entries) {
    for (const change of (entry?.changes || [])) {
      const value = change?.value;
      if (value?.metadata?.phone_number_id !== phoneNumberId) continue;
      const contacts = new Map<string, string>();
      for (const contact of (value?.contacts || [])) {
        if (contact?.wa_id) contacts.set(contact.wa_id, String(contact?.profile?.name || "WhatsApp contact").slice(0, 150));
      }
      for (const msg of (value?.messages || [])) {
        if (msg?.type !== "text" || !msg?.from || !msg?.text?.body) continue;
        const concern = String(msg.text.body).trim().slice(0, 2000);
        if (concern.length < 2) continue;

        const clinicResponse = await fetch(
          `${supabaseUrl}/rest/v1/clinics?id=eq.${encodeURIComponent(clinicId)}&select=id,owner_user_id&limit=1`,
          { headers: dbHeaders },
        );
        if (!clinicResponse.ok) return response("Clinic routing lookup failed", 502);
        const clinics = await clinicResponse.json();
        const clinic = clinics?.[0];
        if (!clinic?.id || !clinic?.owner_user_id) return response("Configured clinic not found", 404);

        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/whatsapp_intake_requests`, {
          method: "POST",
          headers: dbHeaders,
          body: JSON.stringify({
            clinic_id: clinic.id,
            channel: "whatsapp",
            contact_name: contacts.get(String(msg.from)) || "WhatsApp contact",
            contact_phone: String(msg.from).slice(0, 30),
            concern_summary: concern,
            consent_confirmed: false,
            triage_level: "unreviewed",
            status: "new",
            created_by: clinic.owner_user_id,
          }),
        });
        if (!insertResponse.ok) return response("Could not save intake request", 502);

        // The webhook uses the clinic owner as the system actor because no
        // authenticated staff member initiated this external message.
        // Consent remains false until staff records an appropriate consent process.
        const savedRows = await fetch(
          `${supabaseUrl}/rest/v1/whatsapp_intake_requests?clinic_id=eq.${encodeURIComponent(clinic.id)}&contact_phone=eq.${encodeURIComponent(String(msg.from))}&order=created_at.desc&limit=1&select=id`,
          { headers: { ...dbHeaders, "Prefer": "return=representation" } },
        );
        const saved = savedRows.ok ? await savedRows.json() : [];
        if (saved?.[0]?.id) {
          await fetch(`${supabaseUrl}/rest/v1/whatsapp_intake_activity`, {
            method: "POST",
            headers: dbHeaders,
            body: JSON.stringify({
              clinic_id: clinic.id,
              intake_request_id: saved[0].id,
              activity_type: "received_via_whatsapp",
              activity_note: "Inbound WhatsApp text received. Consent has not been confirmed; staff review required.",
              created_by: clinic.owner_user_id,
            }),
          });
        }
      }
    }
  }

  return response("EVENT_RECEIVED", 200);
});
