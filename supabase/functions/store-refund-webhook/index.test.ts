import { assertEquals } from "jsr:@std/assert@1";
import { handleStoreRefundWebhook, hmacSha256Hex } from "../_shared/store-refund.ts";

const refund = {
  provider: "GOOGLE_PLAY",
  provider_event_id: "refund-event-google-0001",
  provider_transaction_id: "purchase-token-google-0001",
  refund_transaction_id: "refund-google-0001",
  refund_amount_minor: 1200,
  currency: "KRW",
  refund_scope: "PARTIAL",
  occurred_at: "2026-11-18T05:00:00Z",
};

Deno.test("TC-APP-03-1 서명 불일치 환불 알림은 DB 쓰기 전에 거절한다", async () => {
  let calls = 0;
  const response = await handleStoreRefundWebhook(new Request("http://local/functions/v1/store-refund-webhook", {
    method: "POST",
    headers: { "x-provider-signature": "invalid" },
    body: JSON.stringify(refund),
  }), {
    secrets: { GOOGLE_PLAY: "provider-secret" },
    supabase: { rpc: async () => { calls += 1; return { data: [], error: null }; } },
  });
  assertEquals(response.status, 401);
  assertEquals(calls, 0);
});

Deno.test("TC-APP-03-2 서명 검증된 부분환불은 비례 회수 RPC에 전달한다", async () => {
  const body = JSON.stringify(refund);
  const signature = await hmacSha256Hex("provider-secret", body);
  let args: Record<string, unknown> | undefined;
  const response = await handleStoreRefundWebhook(new Request("http://local/functions/v1/store-refund-webhook", {
    method: "POST",
    headers: { "x-provider-signature": signature },
    body,
  }), {
    secrets: { GOOGLE_PLAY: "provider-secret" },
    supabase: { rpc: async (_name, input) => {
      args = input;
      return { data: [{ purchase_id: 1, status: "PARTIALLY_REFUNDED" }], error: null };
    } },
  });
  assertEquals(response.status, 200);
  assertEquals(args?.p_refund_amount_minor, 1200);
  assertEquals(args?.p_refund_clover_amount, null);
  assertEquals(args?.p_refund_scope, "PARTIAL");
});
