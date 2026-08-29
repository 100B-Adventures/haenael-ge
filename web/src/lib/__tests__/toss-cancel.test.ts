// toss-cancel.test.ts — TossClient.cancelPayment 단위테스트
// Codex money-code 2nd-pass 지적사항(paymentKey 불일치·status!==CANCELED 미검증) 회귀 방지.
// supabase/functions/_shared/toss.ts는 Deno EF 코드지만 fetch/btoa만 쓰므로
// vitest(jsdom/node) 환경에서 그대로 import해 실행 가능하다.

import { describe, it, expect, vi, afterEach } from "vitest";
import { TossClient } from "../../../../supabase/functions/_shared/toss";

const PAYMENT_KEY = "test_payment_key_123";

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("TossClient.cancelPayment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("성공: paymentKey 일치 + status=CANCELED → 정상 반환", async () => {
    mockFetchOnce(200, {
      paymentKey: PAYMENT_KEY,
      status: "CANCELED",
      canceledAt: "2026-07-10T12:00:00Z",
    });

    const client = new TossClient("test_secret_key");
    const result = await client.cancelPayment(PAYMENT_KEY, "테스트 취소");

    expect(result.paymentKey).toBe(PAYMENT_KEY);
    expect(result.status).toBe("CANCELED");
    expect(result.canceledAt).toBe("2026-07-10T12:00:00Z");
  });

  it("paymentKey 불일치 → throw", async () => {
    mockFetchOnce(200, {
      paymentKey: "different_payment_key",
      status: "CANCELED",
    });

    const client = new TossClient("test_secret_key");
    await expect(client.cancelPayment(PAYMENT_KEY, "테스트 취소")).rejects.toThrow(
      /paymentKey mismatch/,
    );
  });

  it("status가 CANCELED가 아님(PARTIAL_CANCELED) → throw", async () => {
    mockFetchOnce(200, {
      paymentKey: PAYMENT_KEY,
      status: "PARTIAL_CANCELED",
    });

    const client = new TossClient("test_secret_key");
    await expect(client.cancelPayment(PAYMENT_KEY, "테스트 취소")).rejects.toThrow(
      /not CANCELED/,
    );
  });

  it("status가 CANCELED가 아님(FAILED) → throw", async () => {
    mockFetchOnce(200, {
      paymentKey: PAYMENT_KEY,
      status: "FAILED",
    });

    const client = new TossClient("test_secret_key");
    await expect(client.cancelPayment(PAYMENT_KEY, "테스트 취소")).rejects.toThrow(
      /not CANCELED/,
    );
  });

  it("HTTP 비-2xx 응답 → throw", async () => {
    mockFetchOnce(400, { message: "이미 취소된 결제입니다." });

    const client = new TossClient("test_secret_key");
    await expect(client.cancelPayment(PAYMENT_KEY, "테스트 취소")).rejects.toThrow(
      "이미 취소된 결제입니다.",
    );
  });

  it("HTTP 비-2xx 응답 + message 없음 → status 포함 fallback 메시지로 throw", async () => {
    mockFetchOnce(500, {});

    const client = new TossClient("test_secret_key");
    await expect(client.cancelPayment(PAYMENT_KEY, "테스트 취소")).rejects.toThrow(
      /Toss cancel failed \(500\)/,
    );
  });
});
