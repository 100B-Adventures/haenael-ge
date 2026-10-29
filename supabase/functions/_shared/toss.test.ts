import { afterEach, describe, expect, it, vi } from "vitest";
import { TossClient } from "./toss.ts";

describe("TossClient.cancelPayment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("B2-PAY28 이미 취소된 결제 응답은 멱등 취소 성공으로 처리한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "ALREADY_CANCELED_PAYMENT",
            message: "이미 취소된 결제 입니다.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      new TossClient("test_sk_fixture").cancelPayment(
        "payment_key_already_canceled",
        "비카드 승인 방어",
      ),
    ).resolves.toMatchObject({
      paymentKey: "payment_key_already_canceled",
      status: "CANCELED",
    });
  });

  it("B2-PAY29 다른 취소 오류는 기존대로 실패시킨다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ code: "INVALID_REQUEST", message: "잘못된 요청" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      new TossClient("test_sk_fixture").cancelPayment(
        "payment_key_invalid_request",
        "비카드 승인 방어",
      ),
    ).rejects.toThrow("잘못된 요청");
  });
});
