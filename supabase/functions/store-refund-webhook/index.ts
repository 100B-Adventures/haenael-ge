import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { GoogleAuth, OAuth2Client } from "npm:google-auth-library@10";
import { handleStoreRefundWebhook, type StoreProvider } from "../_shared/store-refund.ts";

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : undefined;

async function appleVerifier() {
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID");
  const roots = Deno.env.get("APPLE_ROOT_CA_BASE64");
  if (!bundleId || !roots) throw new Error("apple_not_configured");
  const { Environment, SignedDataVerifier } = await import("npm:@apple/app-store-server-library@1");
  const environment = Deno.env.get("APPLE_IAP_ENVIRONMENT") === "PRODUCTION"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;
  return new SignedDataVerifier(
    roots.split(",").map((value) => Buffer.from(value, "base64")),
    true,
    environment,
    bundleId,
    Deno.env.get("APPLE_APP_ID") ? Number(Deno.env.get("APPLE_APP_ID")) : undefined,
  );
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

const apple = {
  async verifyNotification(signedPayload: string) {
    return await (await appleVerifier()).verifyAndDecodeNotification(signedPayload);
  },
  async verifyTransaction(signedTransactionInfo: string) {
    return await (await appleVerifier()).verifyAndDecodeTransaction(signedTransactionInfo);
  },
};

const google = {
  async verifyPushToken(token: string) {
    const audience = Deno.env.get("GOOGLE_PUBSUB_AUDIENCE");
    const expectedEmail = Deno.env.get("GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL");
    if (!audience || !expectedEmail) throw new Error("google_pubsub_not_configured");
    const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    if (!payload || payload.email !== expectedEmail || payload.email_verified !== true) {
      throw new Error("invalid_pubsub_token");
    }
    return { email: payload.email, email_verified: payload.email_verified };
  },
  async getProductPurchase(productId: string, purchaseToken: string) {
    const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
    if (!packageName) throw new Error("google_not_configured");
    const endpoint = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}` +
      `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${await googleAccessToken()}` },
    });
    if (!response.ok) throw new Error("google_lookup_failed");
    return await response.json();
  },
};

if (import.meta.main) {
  Deno.serve((req) => handleStoreRefundWebhook(req, {
    apple,
    google,
    secrets: {
      GOOGLE_ALTERNATIVE: Deno.env.get("GOOGLE_ALTERNATIVE_REFUND_WEBHOOK_SECRET"),
      TOSS_IAP: Deno.env.get("TOSS_IAP_REFUND_WEBHOOK_SECRET"),
    },
    async lookupPurchase(provider: StoreProvider, transactionId: string) {
      if (!admin) throw new Error("service_configuration_missing");
      const { data, error } = await admin.from("store_purchase")
        .select("provider_transaction_id,product_id,clover_amount,gross_amount_minor,refunded_amount_minor,refunded_clover_amount,currency")
        .eq("provider", provider).eq("provider_transaction_id", transactionId).maybeSingle();
      if (error) throw error;
      return data;
    },
    supabase: admin,
  }));
}
