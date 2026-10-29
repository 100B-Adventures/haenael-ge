import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheerPaymentButton } from "../CheerPaymentButton";

const mockRequestPayment = vi.fn();
const mockWidgetSetAmount = vi.fn();
const mockWidgetRequestPayment = vi.fn();
const mockRenderPaymentWindow = vi.fn();
const mockPaymentWindowDestroy = vi.fn();
const paymentWindowHandlers = new Map<string, () => void>();
const mockLoadTossPayments = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/toss", () => ({
  loadTossPayments: (...args: unknown[]) => mockLoadTossPayments(...args),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
  }),
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
    mockWidgetSetAmount.mockResolvedValue(undefined);
    mockWidgetRequestPayment.mockResolvedValue(undefined);
    mockPaymentWindowDestroy.mockResolvedValue(undefined);
    mockRenderPaymentWindow.mockResolvedValue({
      on: (eventName: string, callback: () => void) => {
        paymentWindowHandlers.set(eventName, callback);
      },
      destroy: mockPaymentWindowDestroy,
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockLoadTossPayments.mockResolvedValue({
      payment: () => ({
        requestPayment: mockRequestPayment,
        destroy: vi.fn(),
      }),
      widgets: () => ({
        setAmount: mockWidgetSetAmount,
        renderPaymentWindow: mockRenderPaymentWindow,
        requestPayment: mockWidgetRequestPayment,
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

  it("AUTH-CHEER-01 로그인 세션은 회원 귀속용 access token으로 주문한다", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "member-access-token" } },
    });

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
      expect(fetch).toHaveBeenCalledWith(
        "https://example.supabase.co/functions/v1/cheer-order",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer member-access-token",
          }),
        }),
      );
    });
  });

  it("AUTH-CHEER-02 비로그인은 기존 anon token으로 주문한다", async () => {
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
      expect(fetch).toHaveBeenCalledWith(
        "https://example.supabase.co/functions/v1/cheer-order",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer anon-key",
          }),
        }),
      );
    });
  });

  it("PAY-WIDGET-01 주문서형 키는 widget 결제창 경로를 사용한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_gck_contract");

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
      expect(mockWidgetSetAmount).toHaveBeenCalledWith({
        value: 3000,
        currency: "KRW",
      });
      expect(mockRenderPaymentWindow).toHaveBeenCalledWith({
        orderName: "친구 목표 응원",
      });
    });
    paymentWindowHandlers.get("paymentRequest")?.();
    await waitFor(() => {
      expect(mockWidgetRequestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "order-1",
        }),
      );
    });
    expect(mockRequestPayment).not.toHaveBeenCalled();
  });

  it("PAY-WIDGET-02 실제 결제창 cancel 이벤트는 재시도 상태를 복구한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_gck_contract");

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
      expect(mockRenderPaymentWindow).toHaveBeenCalled();
    });
    paymentWindowHandlers.get("cancel")?.();
    expect(
      await screen.findByText("결제를 취소했어요. 다시 시도할 수 있어요."),
    ).toBeVisible();
    expect(mockPaymentWindowDestroy).toHaveBeenCalledOnce();
    expect(mockWidgetRequestPayment).not.toHaveBeenCalled();
  });
});
