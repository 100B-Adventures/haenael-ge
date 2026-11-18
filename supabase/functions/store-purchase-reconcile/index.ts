import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { GoogleAuth } from "npm:google-auth-library@10";
import { getTossOrderStatus } from "../_shared/toss-partner.ts";
import {
  handleStorePurchaseReconcile,
  type ReconcilePurchase,
} from "../_shared/store-reconcile.ts";
import type { NormalizedStoreRefund } from "../_shared/store-refund.ts";

async function sha256Id(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function confirmedRefund(
  purchase: ReconcilePurchase,
  cumulativeClover: number,
): Promise<NormalizedStoreRefund | null> {
  const refundClover = cumulativeClover - purchase.refunded_clover_amount;
  if (refundClover <= 0) return null;
  const cumulativeAmount = cumulativeClover === purchase.clover_amount
    ? purchase.gross_amount_minor
    : Math.round(purchase.gross_amount_minor * cumulativeClover / purchase.clover_amount);
  const remaining = cumulativeAmount - purchase.refunded_amount_minor;
  if (remaining <= 0) throw new Error("invalid_refund_amount");
  return {
    provider: purchase.provider,
    provider_event_id: `daily-${await sha256Id(`${purchase.provider}:${purchase.provider_transaction_id}:${cumulativeClover}`)}`,
    provider_transaction_id: purchase.provider_transaction_id,
    refund_transaction_id: `daily-${purchase.provider_transaction_id}`,
    refund_amount_minor: remaining,
    refund_clover_amount: refundClover,
    currency: purchase.currency,
    refund_scope: cumulativeClover === purchase.clover_amount ? "FULL" : "PARTIAL",
    occurred_at: new Date().toISOString(),
  };
}

async function googleAccessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("google_not_configured");
  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("google_not_configured");
  return token;
}

async function inspectGoogle(purchase: ReconcilePurchase): Promise<NormalizedStoreRefund | null> {
  const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
  if (!packageName) throw new Error("google_not_configured");
  const endpoint = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}` +
    `/purchases/products/${encodeURIComponent(purchase.product_id)}/tokens/${encodeURIComponent(purchase.provider_transaction_id)}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${await googleAccessToken()}` } });
  if (!response.ok) throw new Error("google_lookup_failed");
  const body = await response.json() as Record<string, unknown>;
  const quantity = Number(body.quantity ?? 1);
  const refundableQuantity = Number(body.refundableQuantity ?? 0);
  if (!Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(refundableQuantity) || refundableQuantity < 0 || refundableQuantity > quantity) {
    throw new Error("invalid_provider_refund_quantity");
  }
  const cumulativeClover = Math.floor(
    purchase.clover_amount * (quantity - refundableQuantity) / quantity,
  );
  return confirmedRefund(purchase, cumulativeClover);
}

async function inspectApple(purchase: ReconcilePurchase): Promise<NormalizedStoreRefund | null> {
  const privateKey = Deno.env.get("APPLE_IAP_PRIVATE_KEY");
  const keyId = Deno.env.get("APPLE_IAP_KEY_ID");
  const issuerId = Deno.env.get("APPLE_IAP_ISSUER_ID");
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID");
  const roots = Deno.env.get("APPLE_ROOT_CA_BASE64");
  if (!privateKey || !keyId || !issuerId || !bundleId || !roots) throw new Error("apple_not_configured");
  const { AppStoreServerAPIClient, Environment, SignedDataVerifier } = await import("npm:@apple/app-store-server-library@1");
  const environment = Deno.env.get("APPLE_IAP_ENVIRONMENT") === "PRODUCTION"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
  const response = await new AppStoreServerAPIClient(privateKey, keyId, issuerId, bundleId, environment)
    .getTransactionInfo(purchase.provider_transaction_id);
  if (!response.signedTransactionInfo) throw new Error("apple_lookup_failed");
  const transaction = await new SignedDataVerifier(
    roots.split(",").map((value) => Buffer.from(value, "base64")),
    true,
    environment,
    bundleId,
    Deno.env.get("APPLE_APP_ID") ? Number(Deno.env.get("APPLE_APP_ID")) : undefined,
  ).verifyAndDecodeTransaction(response.signedTransactionInfo);
  return transaction.revocationDate === undefined
    ? null
    : confirmedRefund(purchase, purchase.clover_amount);
}

async function inspectToss(admin: SupabaseClient, purchase: ReconcilePurchase): Promise<NormalizedStoreRefund | null> {
  const { data, error } = await admin.from("member").select("provider,provider_id")
    .eq("id", purchase.supporter_member_id).single();
  if (error || data?.provider !== "TOSS" || typeof data.provider_id !== "string") {
    throw new Error("toss_member_not_configured");
  }
  const order = await getTossOrderStatus(purchase.provider_transaction_id, data.provider_id);
  return ["REFUNDED", "CANCELED", "CANCELLED"].includes(order.status)
    ? confirmedRefund(purchase, purchase.clover_amount)
    : null;
}

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : undefined;

if (import.meta.main) {
  Deno.serve((req) => handleStorePurchaseReconcile(req, {
    internalToken: Deno.env.get("STORE_PURCHASE_RECONCILE_INTERNAL_TOKEN"),
    async listPurchasePage(cursor) {
      if (!admin) throw new Error("service_configuration_missing");
      let query = admin.from("store_purchase")
        .select("id,provider,provider_transaction_id,product_id,clover_amount,gross_amount_minor,refunded_amount_minor,refunded_clover_amount,currency,supporter_member_id")
        .in("status", ["CREDITED", "PARTIALLY_REFUNDED", "RECOVERY_REQUIRED"])
        .order("id", { ascending: true })
        .limit(500);
      if (cursor) query = query.gt("id", Number(cursor));
      const { data, error } = await query;
      if (error) throw error;
      const purchases = (data ?? []) as ReconcilePurchase[];
      return {
        purchases,
        nextCursor: purchases.length === 500
          ? String(purchases[purchases.length - 1].id)
          : null,
      };
    },
    async inspectPurchase(purchase) {
      if (purchase.provider === "GOOGLE_PLAY") return inspectGoogle(purchase);
      if (purchase.provider === "APPLE") return inspectApple(purchase);
      if (!admin) throw new Error("service_configuration_missing");
      return inspectToss(admin, purchase);
    },
    async reverseRefund(refund) {
      if (!admin) throw new Error("service_configuration_missing");
      const payload = JSON.stringify(refund);
      const { error } = await admin.rpc("reverse_store_purchase", {
        p_provider: refund.provider,
        p_provider_transaction_id: refund.provider_transaction_id,
        p_provider_event_id: refund.provider_event_id,
        p_payload_hash: await sha256Id(payload),
        p_refund_transaction_id: refund.refund_transaction_id ?? null,
        p_refund_amount_minor: refund.refund_amount_minor,
        p_refund_clover_amount: refund.refund_clover_amount,
        p_currency: refund.currency,
        p_refund_scope: refund.refund_scope,
        p_occurred_at: refund.occurred_at,
      });
      if (error) throw error;
    },
  }));
}
