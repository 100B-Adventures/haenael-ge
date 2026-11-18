import { createClient } from "npm:@supabase/supabase-js@2";
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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function parseCheckoutPreparation(value: unknown) {
  const body = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const parsed = {
    intentId: typeof body.intent_id === "string" ? body.intent_id.trim() : "",
    accountBinding: typeof body.account_binding === "string"
      ? body.account_binding.trim()
      : "",
    requestKey: typeof body.request_key === "string"
      ? body.request_key.trim()
      : "",
    returnUrl: typeof body.return_url === "string"
      ? body.return_url.trim()
      : "",
  };
  if (
    !/^[0-9a-f-]{36}$/i.test(parsed.intentId) ||
    !/^[0-9a-f-]{36}$/i.test(parsed.accountBinding) ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(parsed.requestKey) ||
    !/^haenael:\/\/\/?payment\/alternative-return(?:[/?#]|$)/.test(
      parsed.returnUrl,
    )
  ) throw new Error("invalid_request");
  return parsed;
}

export async function handlePrepareAlternativeCheckout(
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
  let input: ReturnType<typeof parseCheckoutPreparation>;
  try {
    input = parseCheckoutPreparation(await req.json());
  } catch {
    return json(400, { error: { code: "invalid_request" } });
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
    return json(401, { error: { code: "unauthorized" } });
  }
  const { data: intent } = await admin.from("store_purchase_intent").select("*")
    .eq("id", input.intentId).maybeSingle();
  if (
    !intent || intent.supporter_member_id !== userData.user.id ||
    intent.provider !== "GOOGLE_ALTERNATIVE"
  ) return json(409, { error: { code: "transaction_owner_mismatch" } });
  if (
    intent.account_binding !== input.accountBinding ||
    intent.request_key !== input.requestKey ||
    intent.status !== "CREATED" ||
    new Date(intent.expires_at).getTime() <= Date.now()
  ) return json(409, { error: { code: "transaction_binding_mismatch" } });

  const token = Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const orderId = `haenael_alt_${crypto.randomUUID().replaceAll("-", "")}`;
  const { error } = await admin.from("alternative_checkout_session").upsert({
    intent_id: input.intentId,
    member_id: userData.user.id,
    token_hash: await sha256(token),
    order_id: orderId,
    return_url: input.returnUrl,
    expires_at: intent.expires_at,
    opened_at: null,
  }, { onConflict: "intent_id" });
  if (error) return json(503, { error: { code: "checkout_prepare_failed" } });
  return json(201, {
    data: { checkout_token: token, expires_at: intent.expires_at },
  });
}

if (import.meta.main) Deno.serve(handlePrepareAlternativeCheckout);
