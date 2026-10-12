import { assertEquals } from "jsr:@std/assert@1";
import { hashId, sendOpsEvent } from "./ops-event.ts";

const ev = {
  kind: "pay" as const,
  title: "결제 승인",
  idempotencyKey: "pay:haenael-ge:o1",
  amount: 5000,
  currency: "KRW",
};
const base = { url: "https://example.test/v1/event", token: "t0k" };

Deno.test("성공: 202 면 true, 헤더·본문 규격", async () => {
  let seen: { headers: Headers; body: Record<string, unknown> } | null = null;
  const ok = await sendOpsEvent(ev, {
    ...base,
    fetchFn: ((_u: string, init: RequestInit) => {
      seen = {
        headers: new Headers(init.headers),
        body: JSON.parse(init.body as string),
      };
      return Promise.resolve(new Response('{"ok":true}', { status: 202 }));
    }) as unknown as typeof fetch,
  });
  assertEquals(ok, true);
  assertEquals(seen!.headers.get("x-ops-token"), "t0k");
  assertEquals(seen!.body.venture, "haenael-ge");
  assertEquals(seen!.body.amount, 5000);
  assertEquals(seen!.body.idempotency_key, "pay:haenael-ge:o1");
});

Deno.test("타임아웃: 2회 시도 후 false, throw 없음", async () => {
  let calls = 0;
  const ok = await sendOpsEvent(ev, {
    ...base,
    timeoutMs: 20,
    fetchFn: ((_u: string, init: RequestInit) => {
      calls++;
      return new Promise((_res, rej) => {
        init.signal!.addEventListener("abort", () => rej(new DOMException("t", "TimeoutError")));
      });
    }) as unknown as typeof fetch,
  });
  assertEquals(ok, false);
  assertEquals(calls, 2);
});

Deno.test("토큰 없음: 호출 자체를 안 하고 false", async () => {
  let calls = 0;
  const ok = await sendOpsEvent(ev, {
    url: base.url,
    token: "",
    fetchFn: (() => { calls++; return Promise.resolve(new Response("", { status: 202 })); }) as unknown as typeof fetch,
  });
  assertEquals(ok, false);
  assertEquals(calls, 0);
});

Deno.test("5xx 한 번 후 재시도 성공", async () => {
  let calls = 0;
  const ok = await sendOpsEvent(ev, {
    ...base,
    fetchFn: (() => {
      calls++;
      return Promise.resolve(new Response("", { status: calls === 1 ? 503 : 202 }));
    }) as unknown as typeof fetch,
  });
  assertEquals(ok, true);
  assertEquals(calls, 2);
});

Deno.test("hashId: 결정적이고 원문을 포함하지 않는다", async () => {
  const a = await hashId("user-uuid-1");
  assertEquals(a, await hashId("user-uuid-1"));
  assertEquals(a.length, 16);
  assertEquals(a.includes("user"), false);
});
