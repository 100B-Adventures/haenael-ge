import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CheerPaymentButton } from "../CheerPaymentButton";

const mockRequestPayment = vi.fn();
const mockWidgetSetAmount = vi.fn();
const mockWidgetRequestPayment = vi.fn();
const mockRenderPaymentWindow = vi.fn();
const mockPaymentWindowDestroy = vi.fn();
const paymentWindowHandlers = new Map<string, (params?: unknown) => void>();
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
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_ck_contract");
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
            customerKey: "anonymous-customer-0001",
          }),
      }),
    );

    mockRequestPayment.mockResolvedValue(undefined);
    mockWidgetSetAmount.mockResolvedValue(undefined);
    mockWidgetRequestPayment.mockResolvedValue(undefined);
    mockPaymentWindowDestroy.mockResolvedValue(undefined);
    paymentWindowHandlers.clear();
    mockRenderPaymentWindow.mockResolvedValue({
      on: (eventName: string, callback: (params?: unknown) => void) => {
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
    cleanup();
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

  it("G4-PAY-01 결제창형 키에서 CARD 선택만 승인 요청한다", async () => {
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

    await waitFor(() => expect(mockRenderPaymentWindow).toHaveBeenCalled());
    paymentWindowHandlers.get("paymentRequest")?.({
      paymentMethod: { method: "CARD", card: { issuerCode: "11" } },
    });
    await waitFor(() => {
      expect(mockWidgetRequestPayment).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: "order-1" }),
      );
    });
    expect(mockRequestPayment).not.toHaveBeenCalled();
  });

  it("G4-PAY-01 결제창형 키에서 계좌이체 선택은 승인 요청 전에 거절한다", async () => {
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

    await waitFor(() => expect(mockRenderPaymentWindow).toHaveBeenCalled());
    paymentWindowHandlers.get("paymentRequest")?.({
      paymentMethod: { method: "TRANSFER", transfer: { provider: "BANKPAY" } },
    });
    expect(
      await screen.findByText("카드를 선택해야 응원 결제를 계속할 수 있어요."),
    ).toBeVisible();
    expect(mockWidgetRequestPayment).not.toHaveBeenCalled();
    expect(mockPaymentWindowDestroy).toHaveBeenCalledTimes(1);
  });

  it("G4-PAY-01 결제 시트를 닫으면 렌더된 결제창을 제거한다", async () => {
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
    await waitFor(() => expect(mockRenderPaymentWindow).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(mockPaymentWindowDestroy).toHaveBeenCalledTimes(1));
  });

  it("G4-PAY-01 컴포넌트가 unmount되면 렌더된 결제창을 제거한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_gck_contract");

    const view = render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
      />,
    );

    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));
    await waitFor(() => expect(mockRenderPaymentWindow).toHaveBeenCalled());
    view.unmount();
    await waitFor(() => expect(mockPaymentWindowDestroy).toHaveBeenCalledTimes(1));
  });

  it("G4-PAY-01 특수문자 없는 이전 customerKey는 Toss 규격 UUID 키로 교체한다", async () => {
    window.localStorage.setItem(
      "haenael_ge_customer_key",
      "abcdefghijklmnopqrstuvwxyz",
    );

    render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
      />,
    );

    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));

    await waitFor(() => expect(mockLoadTossPayments).toHaveBeenCalled());
    expect(window.localStorage.getItem("haenael_ge_customer_key")).toMatch(
      /^anonymous_[0-9a-f-]{36}$/,
    );
  });

  it("G4-PAY-02 Toss SDK의 일반 객체 오류 메시지를 사용자에게 표시한다", async () => {
    mockRequestPayment.mockRejectedValue(
      Object.assign(new Error("클라이언트 키가 잘못되었습니다."), {
        code: "INVALID_CLIENT_KEY",
      }),
    );

    render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
      />,
    );

    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));

    expect(
      await screen.findByText(
        "클라이언트 키가 잘못되었습니다. (INVALID_CLIENT_KEY)",
      ),
    ).toBeVisible();
  });
});
