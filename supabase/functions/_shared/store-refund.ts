export type StoreProvider = "APPLE" | "GOOGLE_PLAY" | "GOOGLE_ALTERNATIVE" | "TOSS_IAP";

export interface NormalizedStoreRefund {
  provider: StoreProvider;
  provider_event_id: string;
  provider_transaction_id: string;
  refund_transaction_id?: string;
  refund_amount_minor: number;
  currency: string;
  refund_scope: "FULL" | "PARTIAL";
  occurred_at: string;
}

export interface RefundRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data?: Array<Record<string, unknown>> | null;
    error: { message?: string } | null;
  }>;
}

export interface StoreRefundDeps {
  secrets: Partial<Record<StoreProvider, string>>;
  supabase?: RefundRpcClient;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "x-region": "ap-northeast-2" },
  });
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

async function sha256Hex(payload: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload)));
}

export function parseNormalizedStoreRefund(value: unknown): NormalizedStoreRefund | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    !["APPLE", "GOOGLE_PLAY", "GOOGLE_ALTERNATIVE", "TOSS_IAP"].includes(String(item.provider)) ||
    typeof item.provider_event_id !== "string" || item.provider_event_id.length < 6 ||
    typeof item.provider_transaction_id !== "string" || item.provider_transaction_id.length < 6 ||
    (item.refund_transaction_id !== undefined && typeof item.refund_transaction_id !== "string") ||
    !Number.isInteger(item.refund_amount_minor) || Number(item.refund_amount_minor) <= 0 ||
    typeof item.currency !== "string" || !/^[A-Z]{3}$/.test(item.currency) ||
    !["FULL", "PARTIAL"].includes(String(item.refund_scope)) ||
    typeof item.occurred_at !== "string" || Number.isNaN(Date.parse(item.occurred_at))
  ) return null;
  return item as unknown as NormalizedStoreRefund;
}

export async function handleStoreRefundWebhook(req: Request, deps: StoreRefundDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed" } });
  const raw = await req.text();
  let parsed: NormalizedStoreRefund | null = null;
  try {
    parsed = parseNormalizedStoreRefund(JSON.parse(raw));
  } catch {
    // Invalid JSON is handled below without writing to DB.
  }
  if (!parsed) return json(400, { error: { code: "invalid_refund_event" } });

  const secret = deps.secrets[parsed.provider];
  const signature = req.headers.get("x-provider-signature")?.replace(/^sha256=/, "") ?? "";
  if (!secret || !signature || !constantTimeEqual(signature, await hmacSha256Hex(secret, raw))) {
    return json(401, { error: { code: "invalid_provider_signature" } });
  }
  if (!deps.supabase) return json(503, { error: { code: "service_configuration_missing" } });

  const { data, error } = await deps.supabase.rpc("reverse_store_purchase", {
    p_provider: parsed.provider,
    p_provider_transaction_id: parsed.provider_transaction_id,
    p_provider_event_id: parsed.provider_event_id,
    p_payload_hash: await sha256Hex(raw),
    p_refund_transaction_id: parsed.refund_transaction_id ?? null,
    p_refund_amount_minor: parsed.refund_amount_minor,
    p_refund_clover_amount: null,
    p_currency: parsed.currency,
    p_refund_scope: parsed.refund_scope,
    p_occurred_at: parsed.occurred_at,
  });
  if (error || !data?.[0]) return json(502, { error: { code: "refund_reversal_failed" } });
  return json(200, { data: data[0] });
}
