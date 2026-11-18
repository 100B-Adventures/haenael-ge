import { assertEquals } from "jsr:@std/assert@1";
import { handleStoreRefundWebhook, hmacSha256Hex } from "../_shared/store-refund.ts";

const purchase = {
  provider_transaction_id: "provider-transaction-0001",
  product_id: "haenael.cheer.clover.3",
  clover_amount: 3,
  gross_amount_minor: 3600,
  refunded_amount_minor: 0,
  refunded_clover_amount: 0,
  currency: "KRW",
};

Deno.test("TC-APP-03-1 Apple V2 signedPayload JWS를 검증하고 확정 수량을 회수한다", async () => {
  let rpcArgs: Record<string, unknown> | undefined;
  const response = await handleStoreRefundWebhook(new Request("http://local/functions/v1/store-refund-webhook", {
    method: "POST",
    body: JSON.stringify({ signedPayload: "apple.notification.jws" }),
  }), {
    apple: {
      verifyNotification: async () => ({
        notificationUUID: "apple-notification-0001",
        notificationType: "REFUND",
        signedDate: Date.parse("2026-11-18T05:00:00Z"),
        data: { signedTransactionInfo: "apple.transaction.jws" },
      }),
      verifyTransaction: async () => ({
        transactionId: purchase.provider_transaction_id,
        productId: purchase.product_id,
        quantity: 1,
        revocationDate: Date.parse("2026-11-18T05:00:00Z"),
      }),
    },
    google: undefined,
    lookupPurchase: async () => purchase,
    supabase: { rpc: async (_name, args) => {
      rpcArgs = args;
      return { data: [{ purchase_id: 1, status: "REFUNDED" }], error: null };
    } },
  });
  assertEquals(response.status, 200);
  assertEquals(rpcArgs?.p_provider, "APPLE");
  assertEquals(rpcArgs?.p_refund_clover_amount, 3);
  assertEquals(rpcArgs?.p_refund_scope, "FULL");
});

Deno.test("TC-APP-03-2 Google RTDN은 Pub/Sub OIDC JWT 검증 뒤 Developer API를 재조회한다", async () => {
  const rtdn = {
    version: "1.0",
    packageName: "app.haenael",
    eventTimeMillis: "1794978000000",
    oneTimeProductNotification: {
      version: "1.0",
      notificationType: 2,
      purchaseToken: purchase.provider_transaction_id,
      sku: purchase.product_id,
    },
  };
  const envelope = {
    message: { messageId: "google-rtdn-message-0001", data: btoa(JSON.stringify(rtdn)) },
    subscription: "projects/haenael/subscriptions/play-rtdn",
  };
  let verifiedToken = "";
  let queried = "";
  let rpcArgs: Record<string, unknown> | undefined;
  const response = await handleStoreRefundWebhook(new Request("http://local/functions/v1/store-refund-webhook", {
    method: "POST",
    headers: { Authorization: "Bearer pubsub-oidc-jwt" },
    body: JSON.stringify(envelope),
  }), {
    apple: undefined,
    google: {
      verifyPushToken: async (token) => {
        verifiedToken = token;
        return { email: "play-rtdn@haenael.iam.gserviceaccount.com", email_verified: true };
      },
      getProductPurchase: async (_productId, token) => {
        queried = token;
        return { purchaseState: 1, quantity: 1, refundableQuantity: 0, productId: purchase.product_id };
      },
    },
    lookupPurchase: async () => purchase,
    supabase: { rpc: async (_name, args) => {
      rpcArgs = args;
      return { data: [{ purchase_id: 1, status: "REFUNDED" }], error: null };
    } },
  });
  assertEquals(response.status, 200);
  assertEquals(verifiedToken, "pubsub-oidc-jwt");
  assertEquals(queried, purchase.provider_transaction_id);
  assertEquals(rpcArgs?.p_refund_clover_amount, 3);
});

Deno.test("TC-APP-03-3 Google Pub/Sub 인증 실패는 Developer API·DB 호출 전에 거절한다", async () => {
  let providerCalls = 0;
  let dbCalls = 0;
  const response = await handleStoreRefundWebhook(new Request("http://local/functions/v1/store-refund-webhook", {
    method: "POST",
    headers: { Authorization: "Bearer forged" },
    body: JSON.stringify({ message: { messageId: "x", data: btoa("{}") } }),
  }), {
    apple: undefined,
    google: {
      verifyPushToken: async () => { throw new Error("invalid_pubsub_token"); },
      getProductPurchase: async () => { providerCalls += 1; return {}; },
    },
    lookupPurchase: async () => { dbCalls += 1; return null; },
    supabase: { rpc: async () => { dbCalls += 1; return { data: [], error: null }; } },
  });
  assertEquals(response.status, 401);
  assertEquals(providerCalls, 0);
  assertEquals(dbCalls, 0);
});

Deno.test("TC-APP-03-8 Toss 서명 환불도 공급자 확정 수량을 RPC에 전달한다", async () => {
  const body = JSON.stringify({
    provider: "TOSS_IAP",
    provider_event_id: "toss-refund-event-0001",
    provider_transaction_id: purchase.provider_transaction_id,
    refund_transaction_id: "toss-refund-0001",
    refund_amount_minor: 3300,
    refund_clover_amount: 3,
    refund_scope: "FULL",
    occurred_at: "2026-11-18T06:00:00Z",
  });
  let rpcArgs: Record<string, unknown> | undefined;
  const response = await handleStoreRefundWebhook(new Request("http://local", {
    method: "POST",
    headers: {
      "x-provider-signature": await hmacSha256Hex("toss-secret", body),
    },
    body,
  }), {
    lookupPurchase: async () => ({ ...purchase, currency: "KRW" }),
    secrets: { TOSS_IAP: "toss-secret" },
    supabase: { rpc: async (_name, args) => {
      rpcArgs = args;
      return { data: [{ purchase_id: 1, status: "REFUNDED" }], error: null };
    } },
  });
  assertEquals(response.status, 200);
  assertEquals(rpcArgs?.p_refund_clover_amount, 3);
});
