// HealthOS AI — patient record sharing OTP verification
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// TERMII_API_KEY, TERMII_SENDER_ID.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
async function digest(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function randomOtp() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, "0");
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const termiiKey = Deno.env.get("TERMII_API_KEY") || "";
  const senderId = Deno.env.get("TERMII_SENDER_ID") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "Server configuration incomplete" }, 503);

  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return json({ error: "Authentication required" }, 401);
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!userResponse.ok) return json({ error: "Invalid or expired session" }, 401);
  const user = await userResponse.json();
  if (!user?.id) return json({ error: "Authenticated patient not found" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(body?.action || "");
  const requestId = String(body?.request_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "Invalid access request" }, 400);

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const base = `${supabaseUrl}/rest/v1`;
  const requestUrl = `${base}/patient_record_share_access_requests?id=eq.${encodeURIComponent(requestId)}&patient_user_id=eq.${encodeURIComponent(user.id)}&select=id,share_id,source_clinic_id,recipient_clinic_id,patient_user_id,status,otp_verified_at`;
  const requestLookup = await fetch(requestUrl, { headers });
  if (!requestLookup.ok) return json({ error: "Could not verify the access request" }, 502);
  const requests = await requestLookup.json();
  const accessRequest = requests?.[0];
  if (!accessRequest || accessRequest.status !== "approved") return json({ error: "Only an approved request belonging to your account can be OTP-verified" }, 403);
  if (accessRequest.otp_verified_at) return json({ verified: true, message: "This request is already OTP-verified." });

  if (action === "send") {
    if (!termiiKey || !senderId) return json({ error: "SMS delivery is not configured yet. Add TERMII_API_KEY and TERMII_SENDER_ID to Supabase Edge Function secrets before sending OTPs." }, 503);
    const profileResponse = await fetch(`${base}/healthos_patient_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=phone_e164&limit=1`, { headers });
    if (!profileResponse.ok) return json({ error: "Could not retrieve your registered phone number" }, 502);
    const profiles = await profileResponse.json();
    const phone = String(profiles?.[0]?.phone_e164 || "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return json({ error: "Add and verify a valid international phone number in your patient profile before requesting OTP." }, 400);

    const existingResponse = await fetch(`${base}/patient_record_share_otp_challenges?request_id=eq.${encodeURIComponent(requestId)}&select=sent_at,send_count,verified_at`, { headers });
    if (!existingResponse.ok) return json({ error: "Could not check OTP delivery limits" }, 502);
    const existing = (await existingResponse.json())?.[0];
    if (existing?.verified_at) return json({ verified: true, message: "This request is already OTP-verified." });
    if (existing && Date.now() - new Date(existing.sent_at).getTime() < 60000) {
      return json({ error: "For security, wait at least 60 seconds before requesting another code." }, 429);
    }
    if (existing && Number(existing.send_count) >= 5) return json({ error: "The maximum of five OTP sends has been reached for this access request." }, 429);

    const otp = randomOtp();
    const pepper = serviceKey.slice(0, 32);
    const otpHash = await digest(`${requestId}:${otp}:${pepper}`);
    const now = new Date().toISOString();
    const challengePayload = {
      request_id: requestId, patient_user_id: user.id, otp_hash: otpHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      sent_at: now, send_count: existing ? Number(existing.send_count) + 1 : 1,
      attempts: 0, verified_at: null, updated_at: now,
    };
    const upsertResponse = await fetch(`${base}/patient_record_share_otp_challenges?on_conflict=request_id`, {
      method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(challengePayload),
    });
    if (!upsertResponse.ok) return json({ error: "Could not create the OTP challenge" }, 502);

    const smsResponse = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone, from: senderId, sms: `Your HealthOS AI medical-record authorisation code is ${otp}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this message.`,
        type: "plain", channel: "generic", api_key: termiiKey,
      }),
    });
    if (!smsResponse.ok) {
      await fetch(`${base}/patient_record_share_otp_challenges?request_id=eq.${encodeURIComponent(requestId)}`, {
        method: "DELETE", headers,
      });
      return json({ error: "SMS provider could not deliver the code. No OTP was issued; try again later." }, 502);
    }
    return json({ sent: true, destination: `••••${phone.slice(-4)}`, expires_in_seconds: 600 });
  }

  if (action === "verify") {
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return json({ error: "Enter the six-digit OTP." }, 400);
    const challengeResponse = await fetch(`${base}/patient_record_share_otp_challenges?request_id=eq.${encodeURIComponent(requestId)}&patient_user_id=eq.${encodeURIComponent(user.id)}&select=otp_hash,expires_at,attempts,verified_at`, { headers });
    if (!challengeResponse.ok) return json({ error: "Could not retrieve the OTP challenge" }, 502);
    const challenge = (await challengeResponse.json())?.[0];
    if (!challenge || challenge.verified_at) return json({ error: "No active OTP challenge exists. Request a new code." }, 400);
    if (new Date(challenge.expires_at).getTime() <= Date.now()) return json({ error: "The OTP has expired. Request a new code." }, 400);
    if (Number(challenge.attempts) >= 5) return json({ error: "Too many incorrect attempts. Request a new code." }, 429);

    const expected = await digest(`${requestId}:${code}:${serviceKey.slice(0, 32)}`);
    if (!safeEqual(expected, challenge.otp_hash)) {
      await fetch(`${base}/patient_record_share_otp_challenges?request_id=eq.${encodeURIComponent(requestId)}`, {
        method: "PATCH", headers, body: JSON.stringify({ attempts: Number(challenge.attempts) + 1, updated_at: new Date().toISOString() }),
      });
      return json({ error: "Incorrect OTP. Check the code and try again." }, 400);
    }

    const verifiedAt = new Date().toISOString();
    const challengeUpdate = await fetch(`${base}/patient_record_share_otp_challenges?request_id=eq.${encodeURIComponent(requestId)}`, {
      method: "PATCH", headers, body: JSON.stringify({ verified_at: verifiedAt, otp_hash: "verified", updated_at: verifiedAt }),
    });
    if (!challengeUpdate.ok) return json({ error: "Could not complete OTP verification" }, 502);
    const requestUpdate = await fetch(`${base}/patient_record_share_access_requests?id=eq.${encodeURIComponent(requestId)}&patient_user_id=eq.${encodeURIComponent(user.id)}&status=eq.approved`, {
      method: "PATCH", headers, body: JSON.stringify({ otp_verified_at: verifiedAt, otp_verified_phone_last4: String((await (await fetch(`${base}/healthos_patient_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=phone_e164&limit=1`, { headers })).json())?.[0]?.phone_e164 || "").slice(-4) }),
    });
    if (!requestUpdate.ok) return json({ error: "OTP passed but access approval could not be updated; contact support." }, 502);
    await fetch(`${base}/patient_record_share_audit`, {
      method: "POST", headers,
      body: JSON.stringify({
        clinic_id: accessRequest.source_clinic_id, share_id: accessRequest.share_id,
        event_type: "otp_verified", actor_id: user.id,
        details: { request_id: requestId, recipient_clinic_id: accessRequest.recipient_clinic_id, verified_at: verifiedAt },
      }),
    });
    return json({ verified: true, message: "OTP verified. The patient's authorisation has an additional verification record. Clinical records remain protected until secure release is implemented." });
  }

  return json({ error: "Unsupported action" }, 400);
});