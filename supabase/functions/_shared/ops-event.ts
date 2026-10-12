// ops-event — 가입·결제 확정 사건을 관제 입구(ops-external-watchdog)로 보낸다.
// 계약: ~/SJ_BRAIN_wiki/ops/inventory/사업체-이벤트-계약.md
// 원칙: DB 커밋 직후 호출, 사용자 흐름을 절대 막지 않는다(타임아웃 2초·재시도 1회·실패는 로그만).
// 개인정보(이메일·전화·이름) 금지. 사용자 ID 는 해시만 쓴다.

export const OPS_VENTURE = "haenael-ge";

export interface OpsEvent {
  kind: "signup" | "pay" | "test";
  title: string;
  idempotencyKey: string;
  amount?: number;
  currency?: string;
  channel?: string;
}

export interface OpsEventDeps {
  url?: string;
  token?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
}

/** 내부 ID 를 그대로 보내지 않고 해시한다(앞 16자). */
export async function hashId(id: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${OPS_VENTURE}:${id}`),
  );
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 성공 true. env 없음·네트워크 오류·비 2xx 는 모두 false 이고 절대 throw 하지 않는다. */
export async function sendOpsEvent(
  ev: OpsEvent,
  deps: OpsEventDeps = {},
): Promise<boolean> {
  try {
    const url = deps.url ?? Deno.env.get("OPS_EVENT_URL");
    const token = deps.token ?? Deno.env.get("OPS_EVENT_TOKEN");
    if (!url || !token) {
      // 값은 쓰지 않고 비어 있는 변수 이름만 남긴다(수집이 조용히 꺼지는 것을 막는다).
      const missing = [!url ? "OPS_EVENT_URL" : "", !token ? "OPS_EVENT_TOKEN" : ""].filter(Boolean);
      console.warn("[ops-event] disabled, missing env:", missing.join(","));
      return false;
    }
    const doFetch = deps.fetchFn ?? fetch;
    const timeoutMs = deps.timeoutMs ?? 2000;
    const at = (deps.now ? deps.now() : new Date()).toISOString();
    const body = JSON.stringify({
      venture: OPS_VENTURE,
      kind: ev.kind,
      title: ev.title,
      idempotency_key: ev.idempotencyKey,
      at,
      ...(ev.amount !== undefined ? { amount: ev.amount } : {}),
      ...(ev.currency ? { currency: ev.currency } : {}),
      ...(ev.channel ? { channel: ev.channel } : {}),
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await doFetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "X-Ops-Token": token },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) return true;
        console.error("[ops-event] rejected", res.status);
      } catch (e) {
        console.error(
          "[ops-event] send failed",
          e instanceof Error ? e.name : "error",
        );
      }
    }
    return false;
  } catch (e) {
    console.error("[ops-event] unexpected", e instanceof Error ? e.name : "error");
    return false;
  }
}

/** 응답을 기다리지 않고 보낸다. Edge 런타임은 응답 후 작업을 죽이므로 waitUntil 에 맡긴다. */
export function fireOpsEvent(ev: OpsEvent): void {
  const p = sendOpsEvent(ev).catch(() => false);
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt && typeof rt.waitUntil === "function") rt.waitUntil(p);
}

/** 해시 계산도 응답 경로 밖(waitUntil 작업 안)에서 한다. */
export function fireSignup(memberId: string): void {
  try {
    const task = (async () => {
      const h = await hashId(memberId);
      await sendOpsEvent({
        kind: "signup",
        title: "신규 가입",
        idempotencyKey: `signup:${OPS_VENTURE}:${h}`,
        channel: "kakao",
      });
    })().catch(() => undefined);
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt && typeof rt.waitUntil === "function") rt.waitUntil(task);
  } catch (_e) { /* 송신 실패는 흐름을 막지 않는다 */ }
}

export function firePay(orderId: string, amount: number): void {
  try {
    fireOpsEvent({
      kind: "pay",
      title: "결제 승인",
      idempotencyKey: `pay:${OPS_VENTURE}:${orderId}`,
      amount,
      currency: "KRW",
      channel: "toss",
    });
  } catch (_e) { /* 송신 실패는 흐름을 막지 않는다 */ }
}
