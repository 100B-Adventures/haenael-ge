import { assertEquals } from "jsr:@std/assert@1";
import { handleStorePurchaseReconcile } from "../_shared/store-reconcile.ts";

Deno.test("TC-APP-03-3 일일 재동기화는 인증 없는 호출을 거절한다", async () => {
  const response = await handleStorePurchaseReconcile(new Request("http://local/functions/v1/store-purchase-reconcile", {
    method: "POST",
  }), {
    internalToken: "daily-secret",
    listPurchases: async () => [],
    inspectPurchase: async () => null,
    reverseRefund: async () => undefined,
  });
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-03-4 누락된 공급자 환불을 재조회해 회수 RPC로 복구한다", async () => {
  let reversed = 0;
  const response = await handleStorePurchaseReconcile(new Request("http://local/functions/v1/store-purchase-reconcile", {
    method: "POST",
    headers: { "x-reconcile-internal-token": "daily-secret" },
  }), {
    internalToken: "daily-secret",
    listPurchases: async () => [{
      provider: "GOOGLE_PLAY",
      provider_transaction_id: "google-token-reconcile-0001",
      product_id: "haenael.cheer.clover.3",
      gross_amount_minor: 3600,
      refunded_amount_minor: 0,
      currency: "KRW",
      supporter_member_id: "00000000-0000-0000-0000-000000000095",
    }],
    inspectPurchase: async (purchase) => ({
      provider: purchase.provider,
      provider_event_id: "daily-google-refund-0001",
      provider_transaction_id: purchase.provider_transaction_id,
      refund_amount_minor: 3600,
      currency: "KRW",
      refund_scope: "FULL",
      occurred_at: "2026-11-18T06:00:00Z",
    }),
    reverseRefund: async () => { reversed += 1; },
  });
  assertEquals(response.status, 200);
  assertEquals(reversed, 1);
  assertEquals(await response.json(), { data: { scanned: 1, refunds: 1, failures: 0 } });
});
