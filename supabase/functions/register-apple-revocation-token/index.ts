import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptSecret } from "../_shared/secret-box.ts";
import { withRegionHeader } from "../_shared/region.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS }),
    ),
  });
}

export function parseAppleRevocationToken(value: unknown) {
  const body = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const token = typeof body.provider_refresh_token === "string"
    ? body.provider_refresh_token.trim()
    : "";
  if (token.length < 16 || token.length > 4096) {
    throw new Error("invalid_token");
  }
  return token;
}

export async function handleRegisterAppleRevocationToken(
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: { code: "unauthorized" } });
  }
  let token: string;
  try {
    token = parseAppleRevocationToken(await req.json());
  } catch {
    return json(400, { error: { code: "invalid_request" } });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("APPLE_REVOCATION_TOKEN_ENCRYPTION_KEY");
  if (!url || !serviceKey || !encryptionKey) {
    return json(503, { error: { code: "service_configuration_missing" } });
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(
    authorization.slice(7),
  );
  if (userError || !userData.user) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const isApple =
    userData.user.identities?.some((identity) =>
      identity.provider === "apple"
    ) ||
    userData.user.app_metadata?.provider === "apple";
  if (!isApple) {
    return json(409, { error: { code: "apple_identity_required" } });
  }
  const encrypted = await encryptSecret(token, encryptionKey);
  const { error } = await admin.from("apple_token_revocation").upsert({
    member_id: userData.user.id,
    token_enc: encrypted,
    status: "READY",
    attempt_count: 0,
    last_error_code: null,
    revoked_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "member_id" });
  if (error) return json(503, { error: { code: "apple_token_store_failed" } });
  return json(201, { data: { stored: true } });
}

if (import.meta.main) Deno.serve(handleRegisterAppleRevocationToken);
