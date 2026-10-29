import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CheerPaymentButton } from "../CheerPaymentButton";

const mockRequestPayment = vi.fn();
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
            customerKey: "anonymous-customer",
          }),
      }),
    );

    mockRequestPayment.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({ data: { session: null } });
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

  it("G4-PAY-01 주문서형 키는 주문 생성 전에 거절한다", async () => {
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

    expect(await screen.findByText("카드 결제용 Toss Payments API 키가 필요합니다.")).toBeVisible();
    expect(fetch).not.toHaveBeenCalled();
    expect(mockLoadTossPayments).not.toHaveBeenCalled();
    expect(mockRequestPayment).not.toHaveBeenCalled();
  });
});
