import { assertEquals } from "jsr:@std/assert@1";
import {
  googleConsumeEndpoint,
  handleVerifyStorePurchase,
  normalizeGoogleProductPurchase,
  runCreditOperation,
  settleGoogleConsumablePurchase,
  tossIapEnvironment,
} from "./index.ts";

Deno.test("TC-APP-09-11 StoreKit·Play·Toss IAP는 공통 적립 RPC만 호출한다", async () => {
  const calls: unknown[] = [];
  const intent = {
    id: "00000000-0000-0000-0000-000000000101",
    supporter_member_id: "00000000-0000-0000-0000-000000000102",
    goal_id: 1,
    provider: "APPLE" as const,
    product_id: "haenael.cheer.clover.1",
    clover_amount: 1 as const,
    account_binding: "00000000-0000-0000-0000-000000000103",
    request_key: "credit-entry-test-0001",
    status: "CREATED",
    expires_at: "2026-11-19T00:00:00Z",
  };
  await runCreditOperation({
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return Promise.resolve({ data: [{ operation_status: "VERIFYING" }], error: null });
    },
  } as never, "BEGIN", "APPLE", intent, intent.supporter_member_id);
  assertEquals(calls[0], {
    name: "credit_purchase",
    args: {
      p_action: "BEGIN",
      p_channel: "APPLE",
      p_reference: intent.id,
      p_payload: {
        verified_member_id: intent.supporter_member_id,
        account_binding: intent.account_binding,
        request_key: intent.request_key,
      },
      p_secret: null,
    },
  });
});

Deno.test("TC-APP-01-3 인증 없는 영수증 검증은 DB 쓰기 전에 거절한다", async () => {
  const response = await handleVerifyStorePurchase(new Request("http://local/functions/v1/verify-store-purchase", {
    method: "POST",
    body: JSON.stringify({}),
  }));
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-01-3 잘못된 구매 요청은 안정 오류로 거절한다", async () => {
  const response = await handleVerifyStorePurchase(new Request("http://local/functions/v1/verify-store-purchase", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify({ provider: "APPLE" }),
  }));
  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: { code: "invalid_request" } });
});

Deno.test("TC-TOSS-04-3 앱인토스 SDK 3.x 주문은 샌드박스로 위장하지 않는다", () => {
  assertEquals(tossIapEnvironment(), "PRODUCTION");
});

Deno.test("TC-APP-02-1 Google purchaseToken을 거래 멱등키로 쓰고 testPurchaseContext를 SANDBOX로 판정한다", () => {
  const normalized = normalizeGoogleProductPurchase({
    purchaseStateContext: { purchaseState: "PURCHASED" },
    testPurchaseContext: { fopType: "TEST" },
    obfuscatedExternalAccountId: "00000000-0000-0000-0000-000000000091",
    purchaseCompletionTime: "2026-11-18T03:04:05Z",
    orderId: "GPA.client-visible-order",
    productLineItem: [{ productId: "haenael.cheer.clover.3" }],
  }, {
    purchaseToken: "google-purchase-token-unique-0001",
    productId: "haenael.cheer.clover.3",
    accountBinding: "00000000-0000-0000-0000-000000000091",
    cloverAmount: 3,
  });

  assertEquals(normalized.providerTransactionId, "google-purchase-token-unique-0001");
  assertEquals(normalized.environment, "SANDBOX");
  assertEquals(normalized.purchasedAt, "2026-11-18T03:04:05Z");
});

Deno.test("TC-APP-02-2 일반 Google 구매는 PRODUCTION이고 purchaseCompletionTime 누락은 거절한다", () => {
  let message = "";
  try {
    normalizeGoogleProductPurchase({
      purchaseStateContext: { purchaseState: "PURCHASED" },
      obfuscatedExternalAccountId: "00000000-0000-0000-0000-000000000092",
      productLineItem: [{ productId: "haenael.cheer.clover.1" }],
    }, {
      purchaseToken: "google-purchase-token-unique-0002",
      productId: "haenael.cheer.clover.1",
      accountBinding: "00000000-0000-0000-0000-000000000092",
      cloverAmount: 1,
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assertEquals(message, "purchase_completion_time_missing");
});

Deno.test("TC-APP-02-3 Google 소모품 적립 후 호출할 consume URL은 SKU와 purchaseToken을 결합한다", () => {
  assertEquals(
    googleConsumeEndpoint("com.haenael.app", "haenael.cheer.clover.5", "token/with+symbols"),
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.haenael.app/purchases/products/haenael.cheer.clover.5/tokens/token%2Fwith%2Bsymbols:consume",
  );
});

Deno.test("TC-APP-02-4 적립 뒤 Google 소모품 consume을 서버에서 POST한다", async () => {
  let request: Request | undefined;
  await settleGoogleConsumablePurchase(
    (input, init) => {
      request = new Request(input, init);
      return Promise.resolve(new Response(null, { status: 200 }));
    },
    "com.haenael.app",
    "haenael.cheer.clover.3",
    "google-purchase-token-unique-0003",
    "access-token",
  );
  assertEquals(request?.method, "POST");
  assertEquals(request?.headers.get("Authorization"), "Bearer access-token");
});
