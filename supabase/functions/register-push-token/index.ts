import { createClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";
import { encryptSecret } from "../_shared/secret-box.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

type PushTokenRequest = {
  platform?: "IOS" | "ANDROID";
  expoPushToken?: string;
  deviceId: string;
  requestKey: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS }),
    ),
  });
}

export function parsePushTokenRequest(
  value: unknown,
  requireToken = true,
): PushTokenRequest {
  const body = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const deviceId = typeof body.device_id === "string"
    ? body.device_id.trim()
    : "";
  const requestKey = typeof body.request_key === "string"
    ? body.request_key.trim()
    : "";
  const platform = body.platform === "IOS" || body.platform === "ANDROID"
    ? body.platform
    : undefined;
  const expoPushToken = typeof body.expo_push_token === "string"
    ? body.expo_push_token.trim()
    : undefined;
  if (
    !/^[A-Za-z0-9._:-]{8,160}$/.test(deviceId) ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(requestKey)
  ) {
    throw new Error("invalid_request");
  }
  if (
    requireToken && (!platform || !expoPushToken ||
      !/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,200}\]$/.test(
        expoPushToken,
      ))
  ) {
    throw new Error("invalid_push_token");
  }
  return { platform, expoPushToken, deviceId, requestKey };
}

export async function handleRegisterPushToken(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST" && req.method !== "DELETE") {
    return json(405, { error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: { code: "unauthorized" } });
  }
  let input: PushTokenRequest;
  try {
    input = parsePushTokenRequest(await req.json(), req.method === "POST");
  } catch (error) {
    const code =
      error instanceof Error && error.message === "invalid_push_token"
        ? "invalid_push_token"
        : "invalid_request";
    return json(400, { error: { code } });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json(503, { error: { code: "service_configuration_missing" } });
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(
    authorization.slice(7),
  );
  if (userError || !userData.user) {
    // account-delete already removed this member's push rows and Auth user.
    // The mobile client then performs one final cleanup call before clearing
    // its local session, so DELETE remains a mutation-free idempotent success.
    if (req.method === "DELETE") {
      return json(200, { data: { deleted: true, already_deleted: true } });
    }
    return json(401, { error: { code: "unauthorized" } });
  }

  if (req.method === "DELETE") {
    const { error } = await admin.from("device_push_token").delete()
      .eq("member_id", userData.user.id).eq("device_id", input.deviceId);
    if (error) {
      return json(503, { error: { code: "push_token_delete_failed" } });
    }
    return json(200, { data: { deleted: true } });
  }

  const encryptionKey = Deno.env.get("PUSH_TOKEN_ENCRYPTION_KEY");
  if (!encryptionKey) {
    return json(503, { error: { code: "service_configuration_missing" } });
  }
  try {
    const tokenEnc = await encryptSecret(input.expoPushToken!, encryptionKey);
    const { error } = await admin.from("device_push_token").upsert({
      member_id: userData.user.id,
      device_id: input.deviceId,
      platform: input.platform,
      token_enc: tokenEnc,
      enabled: true,
      last_request_key: input.requestKey,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id,device_id" });
    if (error) throw error;
    return json(200, { data: { registered: true } });
  } catch {
    return json(503, { error: { code: "push_token_register_failed" } });
  }
}

if (import.meta.main) Deno.serve(handleRegisterPushToken);
