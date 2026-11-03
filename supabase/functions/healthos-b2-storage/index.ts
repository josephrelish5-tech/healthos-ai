import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://healthos-ai-ay6k.onrender.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

const encoder = new TextEncoder();
const awsEncode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}
async function hmac(key: ArrayBuffer | Uint8Array, value: string): Promise<Uint8Array> {
  const raw = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value)));
}
async function signingKey(secret: string, date: string, region: string): Promise<Uint8Array> {
  const kDate = await hmac(encoder.encode("AWS4" + secret), date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, "s3");
  return await hmac(kService, "aws4_request");
}
function canonicalQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => [awsEncode(k), awsEncode(v)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}
async function presign(method: "GET" | "PUT", key: string, contentType = "") {
  const keyId = Deno.env.get("B2_KEY_ID");
  const appKey = Deno.env.get("B2_APPLICATION_KEY");
  const bucket = Deno.env.get("B2_BUCKET_NAME");
  const endpoint = Deno.env.get("B2_ENDPOINT");
  const region = Deno.env.get("B2_REGION");
  if (!keyId || !appKey || !bucket || !endpoint || !region) throw new Error("B2 storage secrets are incomplete");

  const base = new URL(endpoint);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const path = `/${awsEncode(bucket)}/${key.split("/").map(awsEncode).join("/")}`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${keyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": "300",
    "X-Amz-SignedHeaders": "host"
  };
  const query = canonicalQuery(params);
  const canonicalHeaders = `host:${base.host}\n`;
  const canonicalRequest = [method, path, query, canonicalHeaders, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256(canonicalRequest)].join("\n");
  const keyBytes = await signingKey(appKey, dateStamp, region);
  const signature = hex(await hmac(keyBytes, stringToSign));
  const url = `${base.origin}${path}?${query}&X-Amz-Signature=${signature}`;
  return { url, expiresIn: 300, ...(method === "PUT" && contentType ? { requiredHeaders: { "Content-Type": contentType } } : {}) };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !supabaseUrl || !anonKey) return json({ error: "Authentication required" }, 401);

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!userResponse.ok) return json({ error: "Invalid or expired session" }, 401);
  const user = await userResponse.json();
  if (!user?.id) return json({ error: "Unable to identify user" }, 401);

  let body: { action?: string; fileName?: string; contentType?: string; sizeBytes?: number; objectKey?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  try {
    if (body.action === "create-upload") {
      const fileName = String(body.fileName || "").trim();
      const contentType = String(body.contentType || "application/octet-stream").toLowerCase();
      const size = Number(body.sizeBytes || 0);
      if (!fileName || fileName.length > 180 || /[\\/\\\\]/.test(fileName) || fileName === "." || fileName === "..") {
        return json({ error: "Invalid file name" }, 400);
      }
      if (!Number.isFinite(size) || size < 1 || size > 25 * 1024 * 1024) {
        return json({ error: "File size must be between 1 byte and 25 MB for this initial upload service" }, 400);
      }
      const allowed = new Set([
        "application/pdf", "image/jpeg", "image/png", "image/webp",
        "text/plain", "audio/mpeg", "audio/wav", "audio/webm",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ]);
      if (!allowed.has(contentType)) return json({ error: "File type is not allowed" }, 415);
      const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) : "bin";
      const objectKey = `healthos/${user.id}/${crypto.randomUUID()}.${extension || "bin"}`;
      const signed = await presign("PUT", objectKey, contentType);
      return json({ success: true, objectKey, uploadUrl: signed.url, expiresIn: signed.expiresIn, requiredHeaders: signed.requiredHeaders, maxSizeBytes: 25 * 1024 * 1024 });
    }

    if (body.action === "create-download") {
      const objectKey = String(body.objectKey || "");
      const prefix = `healthos/${user.id}/`;
      if (!objectKey.startsWith(prefix) || objectKey.includes("..") || objectKey.includes("\\")) {
        return json({ error: "You may only retrieve files in your own private HealthOS storage area" }, 403);
      }
      const signed = await presign("GET", objectKey);
      return json({ success: true, objectKey, downloadUrl: signed.url, expiresIn: signed.expiresIn });
    }

    return json({ error: "Unsupported action. Use create-upload or create-download." }, 400);
  } catch (error) {
    console.error("B2 storage operation failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "Storage service is not configured correctly or the request failed" }, 503);
  }
});
