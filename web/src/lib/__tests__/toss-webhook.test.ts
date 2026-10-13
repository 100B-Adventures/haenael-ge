// toss-webhook.test.ts — toss-webhook Edge Function 요청 단위 회귀테스트
// Codex 최종 재리뷰 P2 대응: DB pgTAP(release_v1.test.sql:71-103)은
// reconcile_canceled_payment/record_partial_cancel_review RPC만 검증하고
// EF 핸들러 자체(토큰 검증·payload 검증·Toss Query 실패·DONE/CANCELED 분기·
// payload mismatch 거부)는 요청 단위로 실행된 적이 없었다.
// supabase/functions/_shared/toss-webhook-handler.ts는 Deno 전용 문법 없이
// fetch/Request/Response만 쓰므로 vitest에서 상대경로 import로 직접 실행 가능하다
// (toss-cancel.test.ts와 동일 패턴).

import { describe, it, expect, vi } from "vitest";
import {
  handleTossWebhook,
  type TossWebhookDeps,
  type TossPaymentResponse,
} from "../../../../supabase/functions/_shared/toss-webhook-handler";

const TOKEN = "test_webhook_token_abc123";
const PAYMENT_KEY = "test_payment_key_123";
const ORDER_ID = "hnl_order_000001";

function makeRequest(pathToken: string | null, body: unknown): Request {
  const url = pathToken
    ? `https://example.supabase.co/functions/v1/toss-webhook/${pathToken}`
    : `https://example.supabase.co/functions/v1/toss-webhook`;
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePayment(overrides: Partial<TossPaymentResponse> = {}): TossPaymentResponse {
  return {
    paymentKey: PAYMENT_KEY,
    orderId: ORDER_ID,
    status: "DONE",
    totalAmount: 3000,
    method: "카드",
    approvedAt: "2026-07-16T00:00:00Z",
    receiptUrl: "https://example.com/receipt",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<TossWebhookDeps> = {}): TossWebhookDeps & {
  rpcMock: ReturnType<typeof vi.fn>;
  getPaymentMock: ReturnType<typeof vi.fn>;
  slackMock: ReturnType<typeof vi.fn>;
} {
  const rpcMock = vi.fn().mockResolvedValue({ error: null });
  const getPaymentMock = vi.fn().mockResolvedValue(makePayment());
  const slackMock = vi.fn().mockResolvedValue(true);

  return {
    expectedToken: TOKEN,
    supabase: { rpc: rpcMock },
    toss: { getPayment: getPaymentMock },
    sendSlackAlert: slackMock,
    rpcMock,
    getPaymentMock,
    slackMock,
    ...overrides,
  };
}

const eventBody = (data: Record<string, unknown>) => ({
  eventType: "PAYMENT_STATUS_CHANGED",
  data,
});

describe("handleTossWebhook", () => {
  it("1. 없거나 틀린 경로 토큰 → 401, 다운스트림 미호출(조기 반환)", async () => {
    const deps = makeDeps();

    // 틀린 토큰
    const wrongTokenReq = makeRequest("wrong-token", eventBody({ paymentKey: PAYMENT_KEY }));
    const wrongTokenRes = await handleTossWebhook(wrongTokenReq, deps);
    expect(wrongTokenRes.status).toBe(401);
    expect(await wrongTokenRes.json()).toEqual({ error: "unauthorized" });

    // 경로 토큰 없음
    const noTokenReq = makeRequest(null, eventBody({ paymentKey: PAYMENT_KEY }));
    const noTokenRes = await handleTossWebhook(noTokenReq, deps);
    expect(noTokenRes.status).toBe(401);

    expect(deps.rpcMock).not.toHaveBeenCalled();
    expect(deps.getPaymentMock).not.toHaveBeenCalled();
    expect(deps.slackMock).not.toHaveBeenCalled();
  });

  it("2. paymentKey 누락 → 400 payment_key_required", async () => {
    const deps = makeDeps();
    const req = makeRequest(TOKEN, eventBody({}));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "payment_key_required" });
    expect(deps.getPaymentMock).not.toHaveBeenCalled();
  });

  it("2b. paymentKey가 빈 문자열 → 400 payment_key_required", async () => {
    const deps = makeDeps();
    const req = makeRequest(TOKEN, eventBody({ paymentKey: "" }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "payment_key_required" });
  });

  it("3. Toss Query 실패 → 502 + Slack toss_webhook_lookup_failed", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockRejectedValueOnce(new Error("network down"));

    const req = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "verification_failed" });
    expect(deps.slackMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: "toss_webhook_lookup_failed", severity: "critical" }),
    );
    expect(deps.rpcMock).not.toHaveBeenCalled();
  });

  it("4a. totalAmount 없는 이벤트 + authoritative DONE → confirm_cheer_payment RPC + 200", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "DONE", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );

    // incoming payload에는 paymentKey만 있고 totalAmount/orderId/status는 없음
    const req = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: true, status: "DONE" });
    expect(deps.rpcMock).toHaveBeenCalledTimes(1);
    expect(deps.rpcMock).toHaveBeenCalledWith(
      "confirm_cheer_payment",
      expect.objectContaining({
        p_order_id: ORDER_ID,
        p_payment_key: PAYMENT_KEY,
        p_amount_krw: 3000,
      }),
    );
    expect(deps.slackMock).not.toHaveBeenCalled();
  });

  it("4b. totalAmount 없는 이벤트 + authoritative CANCELED → reconcile_canceled_payment RPC + 200", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "CANCELED", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY, canceledAt: "2026-07-16T01:00:00Z" }),
    );

    const req = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: true, status: "CANCELED" });
    expect(deps.rpcMock).toHaveBeenCalledTimes(1);
    expect(deps.rpcMock).toHaveBeenCalledWith(
      "reconcile_canceled_payment",
      expect.objectContaining({
        p_order_id: ORDER_ID,
        p_payment_key: PAYMENT_KEY,
        p_amount_krw: 3000,
      }),
    );
  });

  it("5. optional payload mismatch(orderId 다름) → 400 payload_mismatch + Slack toss_webhook_mismatch", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "DONE", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );

    // incoming payload가 orderId를 명시했는데 authoritative 값과 다름
    const req = makeRequest(
      TOKEN,
      eventBody({ paymentKey: PAYMENT_KEY, orderId: "hnl_order_DIFFERENT" }),
    );
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "payload_mismatch" });
    expect(deps.slackMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: "toss_webhook_mismatch", severity: "critical" }),
    );
    expect(deps.rpcMock).not.toHaveBeenCalled();
  });

  it("5b. optional payload mismatch(totalAmount 다름) → 400 payload_mismatch", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "DONE", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );

    const req = makeRequest(
      TOKEN,
      eventBody({ paymentKey: PAYMENT_KEY, totalAmount: 9999 }),
    );
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "payload_mismatch" });
  });

  it("6. 중복 취소(CANCELED) 웹훅 재시도 — 매번 200, 재시도 안전", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValue(
      makePayment({ status: "CANCELED", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );

    const req1 = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res1 = await handleTossWebhook(req1, deps);
    expect(res1.status).toBe(200);
    expect(await res1.json()).toEqual({ processed: true, status: "CANCELED" });

    const req2 = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res2 = await handleTossWebhook(req2, deps);
    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({ processed: true, status: "CANCELED" });

    expect(deps.rpcMock).toHaveBeenCalledTimes(2);
    expect(deps.rpcMock).toHaveBeenNthCalledWith(
      1,
      "reconcile_canceled_payment",
      expect.objectContaining({ p_order_id: ORDER_ID, p_payment_key: PAYMENT_KEY }),
    );
    expect(deps.rpcMock).toHaveBeenNthCalledWith(
      2,
      "reconcile_canceled_payment",
      expect.objectContaining({ p_order_id: ORDER_ID, p_payment_key: PAYMENT_KEY }),
    );
  });

  it("6b. 취소 시 잔액부족 review_required → 200 reviewRequired:true + Slack payment_cancel_balance_insufficient(critical)", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "CANCELED", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );
    // reconcile_canceled_payment(20260716120000)이 잔액부족 durable 마커를 세팅하고
    // review_required=true를 반환하는 경우를 mock — 예외 없이 성공 응답이 온다.
    deps.rpcMock.mockResolvedValueOnce({
      error: null,
      data: [{ payment_id: 1, payment_status: "DONE", idempotent: false, review_required: true }],
    });

    const req = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: true, reviewRequired: true });
    expect(deps.rpcMock).toHaveBeenCalledTimes(1);
    expect(deps.rpcMock).toHaveBeenCalledWith(
      "reconcile_canceled_payment",
      expect.objectContaining({ p_order_id: ORDER_ID, p_payment_key: PAYMENT_KEY }),
    );
    expect(deps.slackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "payment_cancel_balance_insufficient",
        severity: "critical",
        fields: expect.objectContaining({ orderId: ORDER_ID }),
      }),
    );
  });

  it("6c. 취소 시 review_required 없는 정상 응답(data 배열이지만 review_required=false) → 기존 200 status 응답 유지", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "CANCELED", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );
    deps.rpcMock.mockResolvedValueOnce({
      error: null,
      data: [{ payment_id: 1, payment_status: "CANCELED", idempotent: false, review_required: false }],
    });

    const req = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: true, status: "CANCELED" });
    expect(deps.slackMock).not.toHaveBeenCalled();
  });

  it("7(선택). DONE 처리 중 confirm_cheer_payment RPC 실패 → 500 + Slack payment_reconcile_failed", async () => {
    const deps = makeDeps();
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "DONE", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );
    deps.rpcMock.mockResolvedValueOnce({ error: { code: "P0001" } });

    const req = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "reconcile_failed" });
    expect(deps.slackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "payment_reconcile_failed",
        severity: "critical",
        fields: expect.objectContaining({ code: "P0001" }),
      }),
    );
  });

  it("missing_server_env: supabase/toss 미주입 → 503 (env 없음 시뮬레이션)", async () => {
    const deps = makeDeps({ supabase: undefined, toss: undefined });
    const req = makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY }));
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "missing_server_env" });
  });

  it("eventType이 PAYMENT_STATUS_CHANGED가 아니면 200 ignored (다운스트림 미호출)", async () => {
    const deps = makeDeps();
    const req = makeRequest(TOKEN, {
      eventType: "SOME_OTHER_EVENT",
      data: { paymentKey: PAYMENT_KEY },
    });
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ignored: true });
    expect(deps.getPaymentMock).not.toHaveBeenCalled();
  });

  // Codex 최종 재리뷰 P2 재지적: req.json()이 유효한 JSON이지만 body가 null/배열/원시값이면
  // 기존 try/catch(invalid_json)는 안 걸리고, null인 경우 body.eventType 접근에서
  // unhandled 런타임 예외(500/워커 크래시), 배열·원시값인 경우 오토박싱으로 조용히
  // 200 ignored로 새 나갔다. 아래 3케이스는 이 가드(400 invalid_payload)가 실제로 동작하고
  // throw 없이 정상 Response를 반환하며 다운스트림을 전혀 호출하지 않는지 확인한다.
  it("8. body가 JSON null → 400 invalid_payload, 예외 없이 정상 Response, 다운스트림 미호출", async () => {
    const deps = makeDeps();
    const req = makeRequest(TOKEN, null);

    const res = await handleTossWebhook(req, deps);

    expect(res).toBeInstanceOf(Response); // throw 안 하고 정상 Response로 반환됐는지
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_payload" });
    expect(deps.getPaymentMock).not.toHaveBeenCalled();
    expect(deps.rpcMock).not.toHaveBeenCalled();
    expect(deps.slackMock).not.toHaveBeenCalled();
  });

  it("9. body가 JSON 배열 → 400 invalid_payload, 다운스트림 미호출", async () => {
    const deps = makeDeps();
    const req = makeRequest(TOKEN, [1, 2, 3]);
    const res = await handleTossWebhook(req, deps);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_payload" });
    expect(deps.getPaymentMock).not.toHaveBeenCalled();
    expect(deps.rpcMock).not.toHaveBeenCalled();
    expect(deps.slackMock).not.toHaveBeenCalled();
  });

  it("10. body가 JSON 원시값(문자열/숫자/불리언) → 400 invalid_payload, 다운스트림 미호출", async () => {
    const deps = makeDeps();

    const stringRes = await handleTossWebhook(makeRequest(TOKEN, "just a string"), deps);
    expect(stringRes.status).toBe(400);
    expect(await stringRes.json()).toEqual({ error: "invalid_payload" });

    const numberRes = await handleTossWebhook(makeRequest(TOKEN, 42), deps);
    expect(numberRes.status).toBe(400);
    expect(await numberRes.json()).toEqual({ error: "invalid_payload" });

    const boolRes = await handleTossWebhook(makeRequest(TOKEN, true), deps);
    expect(boolRes.status).toBe(400);
    expect(await boolRes.json()).toEqual({ error: "invalid_payload" });

    expect(deps.getPaymentMock).not.toHaveBeenCalled();
    expect(deps.rpcMock).not.toHaveBeenCalled();
    expect(deps.slackMock).not.toHaveBeenCalled();
  });

  it("관제. DONE 확정 직후 reportPaid 가 (orderId, 금액)으로 한 번 호출된다", async () => {
    const reportPaid = vi.fn();
    const deps = makeDeps({ reportPaid });
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "DONE", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );
    const res = await handleTossWebhook(makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY })), deps);
    expect(res.status).toBe(200);
    expect(reportPaid).toHaveBeenCalledTimes(1);
    expect(reportPaid).toHaveBeenCalledWith(ORDER_ID, 3000);
  });

  it("관제. confirm RPC 가 실패하면 reportPaid 를 부르지 않는다", async () => {
    const reportPaid = vi.fn();
    const deps = makeDeps({ reportPaid });
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "DONE", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );
    deps.rpcMock.mockResolvedValue({ error: { code: "XX000" } });
    const res = await handleTossWebhook(makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY })), deps);
    expect(res.status).toBe(500);
    expect(reportPaid).not.toHaveBeenCalled();
  });

  it("관제. reportPaid 가 던져도 웹훅은 200 으로 끝난다", async () => {
    const deps = makeDeps({ reportPaid: () => { throw new Error("boom"); } });
    deps.getPaymentMock.mockResolvedValueOnce(
      makePayment({ status: "DONE", totalAmount: 3000, orderId: ORDER_ID, paymentKey: PAYMENT_KEY }),
    );
    const res = await handleTossWebhook(makeRequest(TOKEN, eventBody({ paymentKey: PAYMENT_KEY })), deps);
    expect(res.status).toBe(200);
  });
});
