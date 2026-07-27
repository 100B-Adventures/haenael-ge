import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheerPaymentButton } from "../CheerPaymentButton";

const mockRequestPayment = vi.fn();
const mockLoadTossPayments = vi.fn();

vi.mock("@/lib/toss", () => ({
  loadTossPayments: (...args: unknown[]) => mockLoadTossPayments(...args),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("CheerPaymentButton Toss v2 request", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENTS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_ck");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://haenael.example");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            orderId: "order-1",
            orderName: "친구 목표 응원",
            amountKrw: 3000,
            customerKey: "anonymous-customer",
          }),
      }),
    );

    mockRequestPayment.mockResolvedValue(undefined);
    mockLoadTossPayments.mockResolvedValue({
      payment: () => ({
        requestPayment: mockRequestPayment,
        destroy: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("Toss v2 필수 method CARD를 amount와 함께 전달한다", async () => {
    render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
      />,
    );

    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));

    await waitFor(() => {
      expect(mockRequestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "CARD",
          amount: { value: 3000, currency: "KRW" },
          orderId: "order-1",
        }),
      );
    });
  });
});
