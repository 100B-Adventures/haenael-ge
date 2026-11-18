export type StoreProvider = "APPLE" | "GOOGLE_PLAY" | "GOOGLE_ALTERNATIVE" | "TOSS_IAP";

export interface NormalizedStoreRefund {
  provider: StoreProvider;
  provider_event_id: string;
  provider_transaction_id: string;
  refund_transaction_id?: string;
  refund_amount_minor: number;
  refund_clover_amount: number;
  currency: string;
  refund_scope: "FULL" | "PARTIAL";
  occurred_at: string;
}

export interface StorePurchaseSnapshot {
  provider_transaction_id: string;
  product_id: string;
  clover_amount: number;
  gross_amount_minor: number;
  refunded_amount_minor: number;
  refunded_clover_amount: number;
  currency: string;
}

type AppleNotification = {
  notificationUUID?: string;
  notificationType?: string;
  signedDate?: number;
  data?: { signedTransactionInfo?: string };
};

type AppleTransaction = {
  transactionId?: string;
  productId?: string;
  quantity?: number;
  revocationDate?: number;
};

type GooglePurchase = {
  purchaseState?: number;
  quantity?: number;
  refundableQuantity?: number;
  productId?: string;
};

export interface RefundRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data?: Array<Record<string, unknown>> | null;
    error: { message?: string } | null;
  }>;
}

export interface StoreRefundDeps {
  apple?: {
    verifyNotification(signedPayload: string): Promise<AppleNotification>;
    verifyTransaction(signedTransactionInfo: string): Promise<AppleTransaction>;
  };
  google?: {
    verifyPushToken(token: string): Promise<{ email?: string; email_verified?: boolean }>;
    getProductPurchase(productId: string, purchaseToken: string): Promise<GooglePurchase>;
  };
  lookupPurchase(provider: StoreProvider, transactionId: string): Promise<StorePurchaseSnapshot | null>;
  secrets?: Partial<Record<StoreProvider, string>>;
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

async function sha256Hex(payload: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload)));
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function hmacSha256Hex(
  secret: string,
  payload: string,
): Promise<string> {
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

function parseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function decodeBase64Json(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return parseJson(new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0))));
  } catch {
    return null;
  }
}

function confirmedRefund(
  purchase: StorePurchaseSnapshot,
  cumulativeClover: number,
  event: Pick<NormalizedStoreRefund, "provider" | "provider_event_id" | "provider_transaction_id" | "occurred_at">,
): NormalizedStoreRefund | null {
  if (!Number.isInteger(cumulativeClover) || cumulativeClover < 1 || cumulativeClover > purchase.clover_amount) {
    throw new Error("invalid_provider_refund_quantity");
  }
  const incrementalClover = cumulativeClover - purchase.refunded_clover_amount;
  if (incrementalClover < 0) throw new Error("refund_quantity_regressed");
  if (incrementalClover === 0) return null;
  const cumulativeAmount = cumulativeClover === purchase.clover_amount
    ? purchase.gross_amount_minor
    : Math.round(purchase.gross_amount_minor * cumulativeClover / purchase.clover_amount);
  const incrementalAmount = cumulativeAmount - purchase.refunded_amount_minor;
  if (incrementalAmount <= 0) throw new Error("invalid_provider_refund_amount");
  return {
    ...event,
    refund_transaction_id: event.provider_event_id,
    refund_amount_minor: incrementalAmount,
    refund_clover_amount: incrementalClover,
    currency: purchase.currency,
    refund_scope: cumulativeClover === purchase.clover_amount ? "FULL" : "PARTIAL",
  };
}

async function normalizeApple(
  body: Record<string, unknown>,
  deps: StoreRefundDeps,
): Promise<NormalizedStoreRefund | null> {
  const signedPayload = typeof body.signedPayload === "string" ? body.signedPayload : "";
  if (!signedPayload || !deps.apple) throw new Error("invalid_apple_notification");
  const notification = await deps.apple.verifyNotification(signedPayload);
  if (!notification.notificationUUID || !["REFUND", "REVOKE"].includes(notification.notificationType ?? "")) {
    throw new Error("unsupported_apple_notification");
  }
  const signedTransactionInfo = notification.data?.signedTransactionInfo;
  if (!signedTransactionInfo) throw new Error("apple_transaction_missing");
  const transaction = await deps.apple.verifyTransaction(signedTransactionInfo);
  if (!transaction.transactionId || !transaction.productId || transaction.revocationDate === undefined) {
    throw new Error("apple_refund_not_verified");
  }
  const purchase = await deps.lookupPurchase("APPLE", transaction.transactionId);
  if (!purchase || purchase.product_id !== transaction.productId) throw new Error("purchase_not_found");
  return confirmedRefund(purchase, purchase.clover_amount, {
    provider: "APPLE",
    provider_event_id: notification.notificationUUID,
    provider_transaction_id: transaction.transactionId,
    occurred_at: new Date(transaction.revocationDate).toISOString(),
  });
}

async function normalizeGoogle(
  req: Request,
  body: Record<string, unknown>,
  deps: StoreRefundDeps,
): Promise<NormalizedStoreRefund | null> {
  if (!deps.google) throw new Error("google_not_configured");
  const bearer = req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) throw new Error("invalid_pubsub_token");
  const claims = await deps.google.verifyPushToken(bearer);
  if (!claims.email || claims.email_verified !== true) throw new Error("invalid_pubsub_token");
  const message = body.message as Record<string, unknown> | undefined;
  const rtdn = decodeBase64Json(message?.data);
  const oneTime = rtdn?.oneTimeProductNotification as Record<string, unknown> | undefined;
  const purchaseToken = typeof oneTime?.purchaseToken === "string" ? oneTime.purchaseToken : "";
  const productId = typeof oneTime?.sku === "string" ? oneTime.sku : "";
  const notificationType = Number(oneTime?.notificationType);
  const messageId = typeof message?.messageId === "string" ? message.messageId : "";
  if (!purchaseToken || !productId || !messageId || notificationType !== 2) {
    throw new Error("unsupported_google_notification");
  }
  const providerPurchase = await deps.google.getProductPurchase(productId, purchaseToken);
  const purchase = await deps.lookupPurchase("GOOGLE_PLAY", purchaseToken);
  if (!purchase || purchase.product_id !== productId || providerPurchase.productId !== productId) {
    throw new Error("purchase_not_found");
  }
  const quantity = Number(providerPurchase.quantity ?? 1);
  const refundableQuantity = Number(providerPurchase.refundableQuantity ?? 0);
  if (!Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(refundableQuantity) || refundableQuantity < 0 || refundableQuantity > quantity) {
    throw new Error("invalid_provider_refund_quantity");
  }
  const refundedUnits = quantity - refundableQuantity;
  if (providerPurchase.purchaseState === 0 && refundedUnits === 0) return null;
  const cumulativeClover = Math.floor(purchase.clover_amount * refundedUnits / quantity);
  const eventTime = Number(rtdn?.eventTimeMillis);
  return confirmedRefund(purchase, cumulativeClover, {
    provider: "GOOGLE_PLAY",
    provider_event_id: messageId,
    provider_transaction_id: purchaseToken,
    occurred_at: Number.isFinite(eventTime) ? new Date(eventTime).toISOString() : new Date().toISOString(),
  });
}

async function normalizeSignedPartner(
  req: Request,
  raw: string,
  body: Record<string, unknown>,
  deps: StoreRefundDeps,
): Promise<NormalizedStoreRefund> {
  const provider = String(body.provider) as StoreProvider;
  if (!(["GOOGLE_ALTERNATIVE", "TOSS_IAP"] as string[]).includes(provider)) {
    throw new Error("unsupported_provider_notification");
  }
  const secret = deps.secrets?.[provider];
  const signature = req.headers.get("x-provider-signature")?.replace(/^sha256=/, "") ?? "";
  if (!secret || !signature || !constantTimeEqual(signature, await hmacSha256Hex(secret, raw))) {
    throw new Error("invalid_provider_token");
  }
  const transactionId = typeof body.provider_transaction_id === "string"
    ? body.provider_transaction_id
    : "";
  const eventId = typeof body.provider_event_id === "string"
    ? body.provider_event_id
    : "";
  const refundAmount = Number(body.refund_amount_minor);
  const refundClover = Number(body.refund_clover_amount);
  const purchase = transactionId
    ? await deps.lookupPurchase(provider, transactionId)
    : null;
  if (
    !purchase || eventId.length < 6 || !Number.isInteger(refundAmount) ||
    refundAmount < 1 || !Number.isInteger(refundClover) || refundClover < 1 ||
    refundClover > purchase.clover_amount - purchase.refunded_clover_amount
  ) {
    throw new Error("invalid_provider_refund_quantity");
  }
  const scope = body.refund_scope;
  const expectedScope = purchase.refunded_clover_amount + refundClover ===
      purchase.clover_amount
    ? "FULL"
    : "PARTIAL";
  if (scope !== expectedScope) throw new Error("refund_scope_mismatch");
  return {
    provider,
    provider_event_id: eventId,
    provider_transaction_id: transactionId,
    refund_transaction_id: typeof body.refund_transaction_id === "string"
      ? body.refund_transaction_id
      : eventId,
    refund_amount_minor: refundAmount,
    refund_clover_amount: refundClover,
    currency: purchase.currency,
    refund_scope: expectedScope,
    occurred_at: typeof body.occurred_at === "string" &&
        !Number.isNaN(Date.parse(body.occurred_at))
      ? body.occurred_at
      : new Date().toISOString(),
  };
}

async function reverseRefund(raw: string, refund: NormalizedStoreRefund | null, deps: StoreRefundDeps): Promise<Response> {
  if (!refund) return json(200, { data: { is_replay: true } });
  if (!deps.supabase) return json(503, { error: { code: "service_configuration_missing" } });
  const { data, error } = await deps.supabase.rpc("reverse_store_purchase", {
    p_provider: refund.provider,
    p_provider_transaction_id: refund.provider_transaction_id,
    p_provider_event_id: refund.provider_event_id,
    p_payload_hash: await sha256Hex(raw),
    p_refund_transaction_id: refund.refund_transaction_id ?? null,
    p_refund_amount_minor: refund.refund_amount_minor,
    p_refund_clover_amount: refund.refund_clover_amount,
    p_currency: refund.currency,
    p_refund_scope: refund.refund_scope,
    p_occurred_at: refund.occurred_at,
  });
  if (error || !data?.[0]) return json(502, { error: { code: "refund_reversal_failed" } });
  return json(200, { data: data[0] });
}

export async function handleStoreRefundWebhook(req: Request, deps: StoreRefundDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed" } });
  const raw = await req.text();
  const body = parseJson(raw);
  if (!body) return json(400, { error: { code: "invalid_refund_event" } });
  try {
    const refund = Object.hasOwn(body, "signedPayload")
      ? await normalizeApple(body, deps)
      : Object.hasOwn(body, "message")
      ? await normalizeGoogle(req, body, deps)
      : await normalizeSignedPartner(req, raw, body, deps);
    return await reverseRefund(raw, refund, deps);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_refund_event";
    if (code.includes("token") || code.includes("apple_notification") || code.includes("apple_refund")) {
      return json(401, { error: { code: "invalid_provider_signature" } });
    }
    if (code === "purchase_not_found") return json(404, { error: { code } });
    return json(400, { error: { code: "invalid_refund_event" } });
  }
}
