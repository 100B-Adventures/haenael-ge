import { assertEquals } from "jsr:@std/assert@1";
import { hashId, sendOpsEvent } from "./ops-event.ts";

const ev = {
  kind: "pay" as const,
  title: "결제 승인",
  idempotencyKey: "pay:haenael-ge:o1",
  amount: 5000,
  currency: "KRW",
};
const base = { url: "https://ops-external-watchdog.rosemallow95.workers.dev/v1/event", token: "t0k" };

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
      return Promise.resolve(new Response('{"ok":true}', { status: calls === 1 ? 503 : 202 }));
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

Deno.test("fireSignup / firePay 는 EdgeRuntime.waitUntil 에 작업을 등록한다", async () => {
  Deno.env.set("OPS_EVENT_URL", "https://ops-external-watchdog.rosemallow95.workers.dev/v1/event");
  Deno.env.set("OPS_EVENT_TOKEN", "t0k");
  const keys: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((_u: string, init?: RequestInit) => {
    keys.push(JSON.parse(init!.body as string).idempotency_key);
    return Promise.resolve(new Response('{"ok":true}', { status: 202 }));
  }) as unknown as typeof fetch;
  const waits: Promise<unknown>[] = [];
  (globalThis as unknown as { EdgeRuntime: unknown }).EdgeRuntime = { waitUntil: (p: Promise<unknown>) => waits.push(p) };
  try {
    const { fireSignup, firePay } = await import("./ops-event.ts");
    fireSignup("member-1");
    firePay("order-1", 3000);
    assertEquals(waits.length, 2);
    await Promise.all(waits);
    assertEquals(keys.some((k) => k.startsWith("signup:haenael-ge:")), true);
    assertEquals(keys.includes("pay:haenael-ge:order-1"), true);
  } finally {
    globalThis.fetch = realFetch;
  }
});

Deno.test("env 누락 시 변수 이름만 경고하고 값은 쓰지 않는다", async () => {
  const warns: string[] = [];
  const realWarn = console.warn;
  console.warn = (...a: unknown[]) => { warns.push(a.join(" ")); };
  try {
    Deno.env.delete("OPS_EVENT_URL");
    Deno.env.delete("OPS_EVENT_TOKEN");
    const { sendOpsEvent } = await import("./ops-event.ts");
    const ok = await sendOpsEvent({ kind: "test", title: "t", idempotencyKey: "test:k" });
    assertEquals(ok, false);
    assertEquals(warns.some((w) => w.includes("OPS_EVENT_URL") && w.includes("OPS_EVENT_TOKEN")), true);
  } finally {
    console.warn = realWarn;
  }
});

// ---- 강화 계약: 202 + ok:true 만 성공, 4xx 재시도 없음, redirect 금지, URL 허용목록 ----
const mk = (fn: (init: RequestInit) => Response | Promise<Response>) => {
  const state = { calls: 0, inits: [] as RequestInit[] };
  const fetchFn = ((_u: string, init: RequestInit) => {
    state.calls++;
    state.inits.push(init);
    return Promise.resolve(fn(init));
  }) as unknown as typeof fetch;
  return { state, fetchFn };
};

Deno.test("200 은 실패(202 만 성공)", async () => {
  const m = mk(() => new Response('{"ok":true}', { status: 200 }));
  assertEquals(await sendOpsEvent(ev, { ...base, fetchFn: m.fetchFn }), false);
  assertEquals(m.state.calls, 1);
});

Deno.test("202 라도 본문 ok:true 가 아니면 실패", async () => {
  const m = mk(() => new Response('{"ok":false}', { status: 202 }));
  assertEquals(await sendOpsEvent(ev, { ...base, fetchFn: m.fetchFn }), false);
});

Deno.test("4xx 는 재시도 0회", async () => {
  const m = mk(() => new Response("", { status: 401 }));
  assertEquals(await sendOpsEvent(ev, { ...base, fetchFn: m.fetchFn }), false);
  assertEquals(m.state.calls, 1);
});

Deno.test("429 는 재시도 1회", async () => {
  const m = mk(() => new Response("", { status: 429 }));
  assertEquals(await sendOpsEvent(ev, { ...base, fetchFn: m.fetchFn }), false);
  assertEquals(m.state.calls, 2);
});

Deno.test("5xx 지속이면 재시도 1회 뒤 실패(총 2회)", async () => {
  const m = mk(() => new Response("", { status: 503 }));
  assertEquals(await sendOpsEvent(ev, { ...base, fetchFn: m.fetchFn }), false);
  assertEquals(m.state.calls, 2);
});

Deno.test("redirect:error 로 호출하고 3xx 응답도 실패", async () => {
  const m = mk(() => new Response("", { status: 302, headers: { location: "https://evil.test/" } }));
  assertEquals(await sendOpsEvent(ev, { ...base, fetchFn: m.fetchFn }), false);
  assertEquals(m.state.inits[0].redirect, "error");
  assertEquals(m.state.calls, 1);
});

Deno.test("허용 밖 URL 은 송신 0회", async () => {
  for (const url of [
    "http://ops-external-watchdog.rosemallow95.workers.dev/v1/event",
    "https://evil.test/v1/event",
    "https://ops-external-watchdog.rosemallow95.workers.dev/other",
    "https://ops-external-watchdog.rosemallow95.workers.dev.evil.test/v1/event",
    "https://u:p@ops-external-watchdog.rosemallow95.workers.dev/v1/event",
    "not a url",
  ]) {
    const m = mk(() => new Response('{"ok":true}', { status: 202 }));
    assertEquals(await sendOpsEvent(ev, { url, token: "t0k", fetchFn: m.fetchFn }), false);
    assertEquals(m.state.calls, 0, url);
  }
});

Deno.test("실패 로그에 토큰·URL·본문이 없다", async () => {
  const logs: string[] = [];
  const realErr = console.error;
  console.error = (...a: unknown[]) => { logs.push(a.join(" ")); };
  try {
    const m = mk(() => new Response("secret-body t0k", { status: 401 }));
    await sendOpsEvent(ev, { ...base, fetchFn: m.fetchFn });
  } finally {
    console.error = realErr;
  }
  const all = logs.join("\n");
  assertEquals(all.includes("t0k") || all.includes("workers.dev") || all.includes("secret-body"), false);
  assertEquals(all.includes("401"), true);
});

// ---- 필수 조건 5·6 ----
Deno.test("0원·음수 결제는 송신하지 않는다", async () => {
  for (const amount of [0, -1, 1.5]) {
    const m = mk(() => new Response('{"ok":true}', { status: 202 }));
    assertEquals(await sendOpsEvent({ ...ev, amount }, { ...base, fetchFn: m.fetchFn }), false);
    assertEquals(m.state.calls, 0);
  }
});

Deno.test("토스 테스트 키면 firePay 는 송신하지 않는다", async () => {
  Deno.env.set("OPS_EVENT_URL", base.url);
  Deno.env.set("OPS_EVENT_TOKEN", "t0k");
  Deno.env.set("TOSS_SECRET_KEY", "test_sk_dummy");
  let calls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => { calls++; return Promise.resolve(new Response('{"ok":true}', { status: 202 })); }) as unknown as typeof fetch;
  try {
    const { firePay } = await import("./ops-event.ts");
    firePay("order-t", 3000);
    await new Promise((r) => setTimeout(r, 20));
    assertEquals(calls, 0);
  } finally {
    globalThis.fetch = realFetch;
    Deno.env.delete("TOSS_SECRET_KEY");
  }
});

Deno.test("기동 경고: 토큰·주소가 비면 WARN 한 줄, 변수 이름만", async () => {
  Deno.env.delete("OPS_EVENT_URL");
  Deno.env.set("OPS_EVENT_TOKEN", "secret-value");
  const warns: string[] = [];
  const realWarn = console.warn;
  console.warn = (...a: unknown[]) => { warns.push(a.join(" ")); };
  try {
    const { warnIfOpsEventDisabled } = await import("./ops-event.ts");
    warnIfOpsEventDisabled();
  } finally {
    console.warn = realWarn;
    Deno.env.delete("OPS_EVENT_TOKEN");
  }
  assertEquals(warns.length, 1);
  assertEquals(warns[0].includes("OPS_EVENT_URL"), true);
  assertEquals(warns[0].includes("secret-value"), false);
});
