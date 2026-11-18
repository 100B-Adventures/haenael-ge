import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { getTossOrderStatus } from "../_shared/toss-partner.ts";
import { withRegionHeader } from "../_shared/region.ts";

type Provider = "APPLE" | "GOOGLE_PLAY" | "TOSS_IAP";
type Environment = "SANDBOX" | "PRODUCTION";

interface PurchaseRequest {
  provider: Provider;
  intent_id: string;
  provider_transaction_id: string;
  receipt?: string;
  message?: string;
  anonymous?: boolean;
  request_key: string;
}

interface IntentRow {
  id: string;
  supporter_member_id: string;
  goal_id: number;
  provider: Provider;
  product_id: string;
  clover_amount: 1 | 3 | 5 | 10;
  account_binding: string;
  status: string;
  expires_at: string;
}

interface VerifiedPurchase {
  providerTransactionId: string;
  accountBinding: string;
  productId: string;
  environment: Environment;
  currency: string;
  grossAmountMinor: number;
  purchasedAt: string;
}

export function tossIapEnvironment(): Environment {
  // Apps in Toss SDK 3.x has no sandbox order API. A server-verifiable Toss order is always real.
  return "PRODUCTION";
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const REQUEST_KEY = /^[A-Za-z0-9_-]{8,128}$/;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(new Headers({ "Content-Type": "application/json", ...CORS })),
  });
}

function parseRequest(value: unknown): PurchaseRequest | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (
    !["APPLE", "GOOGLE_PLAY", "TOSS_IAP"].includes(String(input.provider)) ||
    typeof input.intent_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.intent_id) ||
    typeof input.provider_transaction_id !== "string" || input.provider_transaction_id.length < 6 ||
    typeof input.request_key !== "string" || !REQUEST_KEY.test(input.request_key) ||
    (input.receipt !== undefined && typeof input.receipt !== "string") ||
    (input.message !== undefined && (typeof input.message !== "string" || input.message.length > 140))
  ) return null;
  return input as unknown as PurchaseRequest;
}

function expectedAmount(provider: Provider, cloverAmount: number): number {
  if (provider === "TOSS_IAP") {
    const configured = Number(Deno.env.get(`TOSS_IAP_PRICE_${cloverAmount}`));
    if (!Number.isInteger(configured) || configured <= 0) throw new Error("product_catalog_missing");
    return configured;
  }
  return 1200 * cloverAmount;
}

function decodeBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

async function verifyApple(
  input: PurchaseRequest,
  intent: IntentRow,
): Promise<VerifiedPurchase> {
  const privateKey = Deno.env.get("APPLE_IAP_PRIVATE_KEY");
  const keyId = Deno.env.get("APPLE_IAP_KEY_ID");
  const issuerId = Deno.env.get("APPLE_IAP_ISSUER_ID");
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID");
  const roots = Deno.env.get("APPLE_ROOT_CA_BASE64");
  if (!privateKey || !keyId || !issuerId || !bundleId || !roots) {
    throw new Error("provider_not_configured");
  }
  const {
    AppStoreServerAPIClient,
    Environment,
    SignedDataVerifier,
  } = await import("npm:@apple/app-store-server-library@1");
  const environment = Deno.env.get("APPLE_IAP_ENVIRONMENT") === "PRODUCTION"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
  const client = new AppStoreServerAPIClient(privateKey, keyId, issuerId, bundleId, environment);
  const response = await client.getTransactionInfo(input.provider_transaction_id);
  if (!response.signedTransactionInfo) throw new Error("invalid_receipt");
  const verifier = new SignedDataVerifier(
    roots.split(",").map(decodeBase64),
    true,
    environment,
    bundleId,
    Deno.env.get("APPLE_APP_ID") ? Number(Deno.env.get("APPLE_APP_ID")) : undefined,
  );
  const transaction = await verifier.verifyAndDecodeTransaction(response.signedTransactionInfo);
  if (
    transaction.transactionId !== input.provider_transaction_id ||
    transaction.productId !== intent.product_id ||
    transaction.appAccountToken !== intent.account_binding ||
    transaction.revocationDate !== undefined ||
    Number(transaction.quantity ?? 1) !== 1
  ) throw new Error("transaction_binding_mismatch");
  return {
    providerTransactionId: transaction.transactionId,
    accountBinding: transaction.appAccountToken,
    productId: transaction.productId,
    environment: environment === Environment.PRODUCTION ? "PRODUCTION" : "SANDBOX",
    currency: transaction.currency ?? "KRW",
    grossAmountMinor: expectedAmount("APPLE", intent.clover_amount),
    purchasedAt: new Date(Number(transaction.purchaseDate)).toISOString(),
  };
}

async function verifyGoogle(
  input: PurchaseRequest,
  intent: IntentRow,
): Promise<VerifiedPurchase> {
  if (!input.receipt) throw new Error("invalid_receipt");
  const credentialsRaw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
  if (!credentialsRaw || !packageName) throw new Error("provider_not_configured");
  const { GoogleAuth } = await import("npm:google-auth-library@10");
  const auth = new GoogleAuth({
    credentials: JSON.parse(credentialsRaw),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("provider_unavailable");
  const endpoint = new URL(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/productsv2/tokens/${encodeURIComponent(input.receipt)}`,
  );
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("invalid_receipt");
  const purchase = await response.json() as Record<string, unknown>;
  const state = (purchase.purchaseStateContext as Record<string, unknown> | undefined)?.purchaseState;
  const lines = purchase.productLineItem as Array<Record<string, unknown>> | undefined;
  const line = lines?.find((candidate) => candidate.productId === intent.product_id);
  const account = purchase.obfuscatedExternalAccountId;
  if (state !== "PURCHASED" || !line || account !== intent.account_binding) {
    throw new Error("transaction_binding_mismatch");
  }
  const orderId = typeof purchase.orderId === "string" ? purchase.orderId : input.provider_transaction_id;
  return {
    providerTransactionId: orderId,
    accountBinding: account as string,
    productId: intent.product_id,
    environment: Deno.env.get("GOOGLE_PLAY_ENVIRONMENT") === "PRODUCTION" ? "PRODUCTION" : "SANDBOX",
    currency: "KRW",
    grossAmountMinor: expectedAmount("GOOGLE_PLAY", intent.clover_amount),
    purchasedAt: typeof purchase.startTime === "string" ? purchase.startTime : new Date().toISOString(),
  };
}

async function verifyToss(
  input: PurchaseRequest,
  intent: IntentRow,
  tossUserKey: string,
): Promise<VerifiedPurchase> {
  const order = await getTossOrderStatus(input.provider_transaction_id, tossUserKey);
  const grossAmountMinor = expectedAmount("TOSS_IAP", intent.clover_amount);
  if (
    order.status !== "PAYMENT_COMPLETED" && order.status !== "PURCHASED" ||
    order.sku !== intent.product_id
  ) throw new Error("transaction_binding_mismatch");
  return {
    providerTransactionId: order.orderId,
    accountBinding: intent.account_binding,
    productId: order.sku,
    environment: tossIapEnvironment(),
    currency: "KRW",
    grossAmountMinor,
    purchasedAt: order.statusDeterminedAt,
  };
}

async function loadTossUserKey(admin: SupabaseClient, memberId: string): Promise<string> {
  const { data, error } = await admin
    .from("member")
    .select("provider,provider_id")
    .eq("id", memberId)
    .single();
  if (error || data?.provider !== "TOSS" || typeof data.provider_id !== "string" || !data.provider_id) {
    throw new Error("transaction_owner_mismatch");
  }
  return data.provider_id;
}

async function loadIntent(
  admin: SupabaseClient,
  input: PurchaseRequest,
  memberId: string,
): Promise<IntentRow> {
  const { data, error } = await admin.from("store_purchase_intent").select("*").eq("id", input.intent_id).single();
  if (error || !data) throw new Error("purchase_intent_invalid");
  const intent = data as IntentRow;
  if (intent.supporter_member_id !== memberId || intent.provider !== input.provider) {
    throw new Error("transaction_owner_mismatch");
  }
  return intent;
}

export async function handleVerifyStorePurchase(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed" } });
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: { code: "unauthorized" } });

  let parsed: PurchaseRequest | null = null;
  try {
    parsed = parseRequest(await req.json());
  } catch {
    // handled below
  }
  if (!parsed) return json(400, { error: { code: "invalid_request" } });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(503, { error: { code: "service_configuration_missing" } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(authHeader.slice(7));
  if (userError || !userData.user) return json(401, { error: { code: "unauthorized" } });

  try {
    const intent = await loadIntent(admin, parsed, userData.user.id);
    const verified = parsed.provider === "APPLE"
      ? await verifyApple(parsed, intent)
      : parsed.provider === "GOOGLE_PLAY"
      ? await verifyGoogle(parsed, intent)
      : await verifyToss(parsed, intent, await loadTossUserKey(admin, userData.user.id));
    const { data, error } = await admin.rpc("credit_store_purchase", {
      p_intent_id: intent.id,
      p_verified_member_id: userData.user.id,
      p_account_binding: verified.accountBinding,
      p_provider: parsed.provider,
      p_provider_transaction_id: verified.providerTransactionId,
      p_environment: verified.environment,
      p_product_id: verified.productId,
      p_currency: verified.currency,
      p_gross_amount_minor: verified.grossAmountMinor,
      p_clover_amount: intent.clover_amount,
      p_message: parsed.message ?? "",
      p_is_anonymous: parsed.anonymous === true,
      p_request_key: parsed.request_key,
      p_purchased_at: verified.purchasedAt,
      p_policy_risk: parsed.provider === "TOSS_IAP" ? "INTOSS_CASH_EQUIVALENT" : null,
    });
    if (error || !data?.[0]) throw new Error(error?.message ?? "credit_failed");
    const row = data[0];
    return json(row.is_replay ? 200 : 201, { data: {
      purchase_id: row.purchase_id,
      status: "CREDITED",
      cheer_id: row.cheer_id,
      clover_amount: row.clover_amount,
      available_at: row.available_at,
      is_replay: row.is_replay,
    } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "provider_unavailable";
    const code = message.includes("channel_release_disabled") ? "channel_release_disabled"
      : message.includes("owner") ? "transaction_owner_mismatch"
      : message.includes("binding") ? "transaction_binding_mismatch"
      : message.includes("intent") ? "purchase_intent_invalid"
      : message.includes("catalog") || message.includes("configured") ? "provider_not_configured"
      : message.includes("receipt") ? "invalid_receipt"
      : "provider_unavailable";
    const status = code === "channel_release_disabled" || code === "provider_not_configured" ? 503
      : code.includes("mismatch") ? 409
      : code === "purchase_intent_invalid" || code === "invalid_receipt" ? 422
      : 502;
    return json(status, { error: { code } });
  }
}

if (import.meta.main) Deno.serve(handleVerifyStorePurchase);
