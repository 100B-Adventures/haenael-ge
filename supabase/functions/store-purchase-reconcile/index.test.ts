import { assertEquals } from "jsr:@std/assert@1";
import { handleStorePurchaseReconcile } from "../_shared/store-reconcile.ts";

Deno.test("TC-APP-03-4 일일 재동기화는 인증 없는 호출을 거절한다", async () => {
  const response = await handleStorePurchaseReconcile(new Request("http://local", { method: "POST" }), {
    internalToken: "daily-secret",
    listPurchasePage: async () => ({ purchases: [], nextCursor: null }),
    inspectPurchase: async () => null,
    reverseRefund: async () => undefined,
  });
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-03-5 cursor로 500건 뒤 구매까지 전량 재동기화한다", async () => {
  const all = Array.from({ length: 501 }, (_, index) => ({
    id: index + 1,
    provider: "GOOGLE_PLAY" as const,
    provider_transaction_id: `google-token-${String(index + 1).padStart(4, "0")}`,
    product_id: "haenael.cheer.clover.1",
    clover_amount: 1,
    gross_amount_minor: 1200,
    refunded_amount_minor: 0,
    refunded_clover_amount: 0,
    currency: "KRW",
    supporter_member_id: "00000000-0000-0000-0000-000000000095",
  }));
  let pages = 0;
  let inspected = 0;
  const response = await handleStorePurchaseReconcile(new Request("http://local", {
    method: "POST",
    headers: { "x-reconcile-internal-token": "daily-secret" },
  }), {
    internalToken: "daily-secret",
    listPurchasePage: async (cursor) => {
      pages += 1;
      const start = cursor ? Number(cursor) : 0;
      const purchases = all.slice(start, start + 500);
      return { purchases, nextCursor: start + purchases.length < all.length ? String(start + purchases.length) : null };
    },
    inspectPurchase: async () => { inspected += 1; return null; },
    reverseRefund: async () => undefined,
  });
  assertEquals(response.status, 200);
  assertEquals(pages, 2);
  assertEquals(inspected, 501);
  assertEquals(await response.json(), { data: { scanned: 501, refunds: 0, failures: 0 } });
});
