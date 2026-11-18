import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { exchangeTossLogin, getTossOrderStatus } from "./toss-partner.ts";

function queuedFetch(payloads: unknown[]): typeof fetch {
  return (async () => new Response(JSON.stringify(payloads.shift()), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })) as typeof fetch;
}

Deno.test("TC-TOSS-01-1 토스 authorization code는 서버에서 userKey로 교환한다", async () => {
  const identity = await exchangeTossLogin("code-12345678", "SANDBOX", queuedFetch([
    { resultType: "SUCCESS", success: { accessToken: "access-token-123456789" } },
    { resultType: "SUCCESS", success: { userKey: 12345678 } },
  ]));
  assertEquals(identity.userKey, "12345678");
});

Deno.test("TC-TOSS-04-1 지급 전 orderId·sku·상태를 서버에서 검증한다", async () => {
  const order = await getTossOrderStatus("order-123", "12345678", queuedFetch([
    { resultType: "SUCCESS", success: {
      orderId: "order-123", sku: "haenael_cheer_clover_1", status: "PAYMENT_COMPLETED",
      purchaserMatched: true, statusDeterminedAt: "2026-11-18T00:00:00Z",
    } },
  ]));
  assertEquals(order.status, "PAYMENT_COMPLETED");
  assertEquals(order.purchaserMatched, true);
});

Deno.test("TC-TOSS-04-2 다른 orderId 응답은 지급을 거절한다", async () => {
  await assertRejects(() => getTossOrderStatus("order-123", "12345678", queuedFetch([
    { resultType: "SUCCESS", success: {
      orderId: "other", sku: "haenael_cheer_clover_1", status: "PAYMENT_COMPLETED",
      purchaserMatched: true, statusDeterminedAt: "2026-11-18T00:00:00Z",
    } },
  ])), Error, "toss_order_invalid");
});

Deno.test("TC-TOSS-04-2 구매자가 일치하지 않으면 지급을 거절한다", async () => {
  await assertRejects(() => getTossOrderStatus("order-123", "87654321", queuedFetch([
    { resultType: "SUCCESS", success: {
      orderId: "order-123", sku: "haenael_cheer_clover_1", status: "PAYMENT_COMPLETED",
      purchaserMatched: false, statusDeterminedAt: "2026-11-18T00:00:00Z",
    } },
  ])), Error, "toss_order_invalid");
});
