import { afterEach, describe, expect, it, vi } from "vitest";
import { isCardPaymentMethod, TossClient } from "./toss";
import {
  handleTossWebhook,
  type TossPaymentResponse,
  type TossWebhookDeps,
} from "./toss-webhook-handler";

const TOKEN = "security-webhook-token";
const MID = "merchant-security";
const PAYMENT_KEY = "payment-security";

function payment(
  overrides: Partial<TossPaymentResponse> = {},
): TossPaymentResponse {
  return {
    paymentKey: PAYMENT_KEY,
    orderId: "order-security",
    mId: MID,
    status: "DONE",
    totalAmount: 3000,
    method: "카드",
    approvedAt: "2026-10-06T00:00:00+09:00",
    ...overrides,
  };
}

function request(
  data: Record<string, unknown>,
  transmissionId: string | null = "transmission-security",
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (transmissionId) {
    headers.set("tosspayments-webhook-transmission-id", transmissionId);
  }
  return new Request(
    `https://example.supabase.co/functions/v1/toss-webhook/${TOKEN}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ eventType: "PAYMENT_STATUS_CHANGED", data }),
    },
  );
}

function deps(overrides: Partial<TossWebhookDeps> = {}) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_toss_webhook") return { data: "claimed", error: null };
    return { data: null, error: null };
  });
  const getPayment = vi.fn().mockResolvedValue(payment());
  const cancelPayment = vi.fn().mockResolvedValue({ status: "CANCELED" });
  const base: TossWebhookDeps = {
    expectedToken: TOKEN,
    requireMerchantId: true,
    requireTransmissionId: true,
    supabase: { rpc },
    toss: { getPayment, cancelPayment },
    isCardPaymentMethod,
    sendSlackAlert: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return { base, rpc, getPayment };
}

describe("Toss 웹훅 보안 경계", () => {
  it("PAY-NEG-04 mId가 등록 상점과 다르면 결제 상태 전이를 거부한다", async () => {
    const test = deps({
      toss: {
        getPayment: vi.fn().mockResolvedValue(payment({ mId: "other-mid" })),
        cancelPayment: vi.fn().mockResolvedValue({ status: "CANCELED" }),
      },
    });

    const response = await handleTossWebhook(
      request({ paymentKey: PAYMENT_KEY, mId: MID }),
      test.base,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "payload_mismatch" });
    expect(test.rpc).not.toHaveBeenCalledWith(
      "confirm_cheer_payment",
      expect.anything(),
    );
    expect(test.rpc).toHaveBeenCalledWith("release_toss_webhook", {
      p_transmission_id: "transmission-security",
    });
  });

  it("PAY-NEG-05 transmission-id가 없으면 Toss 조회 전에 거부한다", async () => {
    const test = deps();
    const response = await handleTossWebhook(
      request({ paymentKey: PAYMENT_KEY }, null),
      test.base,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "transmission_id_required",
    });
    expect(test.getPayment).not.toHaveBeenCalled();
  });

  it("PAY-NEG-06 처리 완료 transmission-id 재전송은 상태 전이를 반복하지 않는다", async () => {
    const test = deps();
    test.rpc.mockResolvedValueOnce({ data: "processed", error: null });

    const response = await handleTossWebhook(
      request({ paymentKey: PAYMENT_KEY }),
      test.base,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: true, duplicate: true });
    expect(test.getPayment).not.toHaveBeenCalled();
    expect(test.rpc).not.toHaveBeenCalledWith(
      "confirm_cheer_payment",
      expect.anything(),
    );
  });

  it("PAY-OK-01 일치하는 mId와 유일 transmission-id만 상태 전이하고 완료 처리한다", async () => {
    const test = deps();
    const response = await handleTossWebhook(
      request({ paymentKey: PAYMENT_KEY, mId: MID }),
      test.base,
    );

    expect(response.status).toBe(200);
    expect(test.rpc).toHaveBeenCalledWith(
      "confirm_cheer_payment",
      expect.objectContaining({ p_payment_key: PAYMENT_KEY }),
    );
    expect(test.rpc).toHaveBeenCalledWith("complete_toss_webhook", {
      p_transmission_id: "transmission-security",
    });
  });
});

describe("TossClient Payment 객체", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("PAY-OK-02 authoritative 조회 응답의 mId를 보존한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            paymentKey: PAYMENT_KEY,
            orderId: "order-security",
            mId: MID,
            status: "DONE",
            totalAmount: 3000,
            method: "카드",
            approvedAt: "2026-10-06T00:00:00+09:00",
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await new TossClient("test-secret").getPayment(PAYMENT_KEY);
    expect(result.mId).toBe(MID);
  });

  it("G4-PAY-01 승인 응답은 공식 카드 method만 허용한다", () => {
    expect(isCardPaymentMethod("카드")).toBe(true);
    expect(isCardPaymentMethod("계좌이체")).toBe(false);
    expect(isCardPaymentMethod("간편결제")).toBe(false);
  });
});
