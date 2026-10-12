// toss-confirm 라우트 수준 시험: 멱등 재호출(이미 DONE)에서도 관제 결제 이벤트를 같은 키로 보낸다.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("이미 DONE 인 주문 재호출 → 200 idempotent + pay 이벤트(같은 키) 송신", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  Deno.env.set("SUPABASE_URL", "https://sb.test");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc");
  Deno.env.set("TOSS_SECRET_KEY", "tsk");
  Deno.env.set("OPS_EVENT_URL", "https://ops.test/v1/event");
  Deno.env.set("OPS_EVENT_TOKEN", "t0k");

  const opsBodies: Record<string, unknown>[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://ops.test/")) {
      opsBodies.push(JSON.parse(init!.body as string));
      return Promise.resolve(new Response('{"ok":true}', { status: 202 }));
    }
    if (url.includes("/rest/v1/payment")) {
      return Promise.resolve(new Response(JSON.stringify({ id: 1, amount_krw: 5000, status: "DONE" }), {
        status: 200, headers: { "content-type": "application/json" },
      }));
    }
    if (url.includes("/rest/v1/rpc/confirm_cheer_payment")) {
      return Promise.resolve(new Response(JSON.stringify([{
        payment_id: 1, cheer_id: 2, member_id: "m", goal_title: "g", display_name: "d",
      }]), { status: 200, headers: { "content-type": "application/json" } }));
    }
    return Promise.resolve(new Response("{}", { status: 404 }));
  }) as typeof fetch;

  const waits: Promise<unknown>[] = [];
  (globalThis as unknown as { EdgeRuntime: unknown }).EdgeRuntime = { waitUntil: (p: Promise<unknown>) => waits.push(p) };
  let handler: ((r: Request) => Promise<Response>) | undefined;
  const realServe = Deno.serve;
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (h: (r: Request) => Promise<Response>) => { handler = h; return {}; };
  try {
    await import("./index.ts");
    const res = await handler!(new Request("https://f.test/toss-confirm", {
      method: "POST",
      headers: { Authorization: "Bearer x", "content-type": "application/json" },
      body: JSON.stringify({ paymentKey: "pk", orderId: "order-77", amount: 5000 }),
    }));
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
    // deno-lint-ignore no-explicit-any
    (Deno as any).serve = realServe;
  }
});
