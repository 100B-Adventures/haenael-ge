// toss-confirm 라우트 수준 시험: 멱등 재호출(이미 DONE)에서도 관제 결제 이벤트를 같은 키로 보낸다.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleTossConfirm } from "./index.ts";

Deno.test("이미 DONE 인 주문 재호출 → 200 idempotent + pay 이벤트(같은 키) 송신", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  Deno.env.set("SUPABASE_URL", "https://sb.test");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc");
  Deno.env.set("TOSS_SECRET_KEY", "tsk");
  Deno.env.set(
    "OPS_EVENT_URL",
    "https://ops-external-watchdog.rosemallow95.workers.dev/v1/event",
  );
  Deno.env.set("OPS_EVENT_TOKEN", "t0k");

  const opsBodies: Record<string, unknown>[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    if (
      url.startsWith("https://ops-external-watchdog.rosemallow95.workers.dev/")
    ) {
      opsBodies.push(JSON.parse(init!.body as string));
      return Promise.resolve(new Response('{"ok":true}', { status: 202 }));
    }
    if (url.includes("/rest/v1/payment")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: 1, amount_krw: 5000, status: "DONE" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }
    if (url.includes("/rest/v1/rpc/confirm_cheer_payment")) {
      return Promise.resolve(
        new Response(
          JSON.stringify([{
            payment_id: 1,
            cheer_id: 2,
            member_id: "m",
            goal_title: "g",
            display_name: "d",
          }]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }
    return Promise.resolve(new Response("{}", { status: 404 }));
  }) as typeof fetch;

  const waits: Promise<unknown>[] = [];
  (globalThis as unknown as { EdgeRuntime: unknown }).EdgeRuntime = {
    waitUntil: (p: Promise<unknown>) => waits.push(p),
  };
  try {
    const res = await handleTossConfirm(
      new Request("https://f.test/toss-confirm", {
        method: "POST",
        headers: {
          Authorization: "Bearer x",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          paymentKey: "pk",
          orderId: "order-77",
          amount: 5000,
        }),
      }),
    );
    assertEquals(res.status, 200);
    assertEquals((await res.json()).idempotent, true);
    await Promise.all(waits);
    assertEquals(waits.length, 1);
    assertEquals(opsBodies.length, 1);
    assertEquals(opsBodies[0].idempotency_key, "pay:haenael-ge:order-77");
    assertEquals(opsBodies[0].amount, 5000);
    assertEquals(opsBodies[0].kind, "pay");
  } finally {
    globalThis.fetch = realFetch;
  }
});

function setPaymentTestEnv() {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  Deno.env.set("SUPABASE_URL", "https://sb.test");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc");
  Deno.env.set("TOSS_SECRET_KEY", "test_sk_contract");
  Deno.env.delete("SLACK_WEBHOOK_URL");
}

function paymentRequest(orderId: string, paymentKey: string, amount: number) {
  return new Request("https://f.test/toss-confirm", {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ orderId, paymentKey, amount }),
  });
}

Deno.test("비카드 승인 취소 성공 → CANCELED 감사 기록 후 unsupported_payment_method", async () => {
  setPaymentTestEnv();
  const realFetch = globalThis.fetch;
  const rpcBodies: Record<string, unknown>[] = [];
  const orderId = "hnl_non_card_2000";
  const paymentKey = "payment_key_non_card_2000";

  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    if (url.includes("/rest/v1/payment?")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: 1, amount_krw: 2000, status: "READY" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }
    if (url.endsWith("/v1/payments/confirm")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            paymentKey,
            orderId,
            status: "DONE",
            totalAmount: 2000,
            method: "계좌이체",
            approvedAt: "2026-10-30T00:00:00Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }
    if (url.endsWith(`/v1/payments/${paymentKey}/cancel`)) {
      return Promise.resolve(
        new Response(JSON.stringify({ paymentKey, status: "CANCELED" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    if (url.includes("/rest/v1/rpc/record_payment_compensation")) {
      rpcBodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(
        new Response(JSON.stringify([{ payment_id: 1, status: "CANCELED" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    return Promise.resolve(new Response("{}", { status: 404 }));
  }) as typeof fetch;

  try {
    const response = await handleTossConfirm(
      paymentRequest(orderId, paymentKey, 2000),
    );
    assertEquals(response.status, 400);
    assertEquals(
      (await response.json()).error.code,
      "unsupported_payment_method",
    );
    assertEquals(rpcBodies.length, 1);
    assertEquals(rpcBodies[0].p_target_status, "CANCELED");
    assertEquals(rpcBodies[0].p_payment_key, paymentKey);
    assertEquals(rpcBodies[0].p_amount_krw, 2000);
  } finally {
    globalThis.fetch = realFetch;
  }
});

Deno.test("비카드 승인 취소 실패 → FAILED 감사 기록 후 non_card_compensation_failed", async () => {
  setPaymentTestEnv();
  const realFetch = globalThis.fetch;
  const rpcBodies: Record<string, unknown>[] = [];
  const orderId = "hnl_non_card_failed";
  const paymentKey = "payment_key_non_card_failed";

  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    if (url.includes("/rest/v1/payment?")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: 2, amount_krw: 3000, status: "READY" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }
    if (url.endsWith("/v1/payments/confirm")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            paymentKey,
            orderId,
            status: "DONE",
            totalAmount: 3000,
            method: "가상계좌",
            approvedAt: "2026-10-30T00:00:00Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }
    if (url.endsWith(`/v1/payments/${paymentKey}/cancel`)) {
      return Promise.resolve(
        new Response(JSON.stringify({ message: "vendor failure" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    if (url.includes("/rest/v1/rpc/record_payment_compensation")) {
      rpcBodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(
        new Response(JSON.stringify([{ payment_id: 2, status: "FAILED" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }
    return Promise.resolve(new Response("{}", { status: 404 }));
  }) as typeof fetch;

  try {
    const response = await handleTossConfirm(
      paymentRequest(orderId, paymentKey, 3000),
    );
    assertEquals(response.status, 502);
    assertEquals(
      (await response.json()).error.code,
      "non_card_compensation_failed",
    );
    assertEquals(rpcBodies.length, 1);
    assertEquals(rpcBodies[0].p_target_status, "FAILED");
    assertEquals(rpcBodies[0].p_payment_key, paymentKey);
  } finally {
    globalThis.fetch = realFetch;
  }
});
