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
const mockPaymentDestroy = vi.fn();
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
    mockPaymentDestroy.mockResolvedValue(undefined);
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
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "member-access-token" } },
    });
    mockLoadTossPayments.mockResolvedValue({
      payment: () => ({
        requestPayment: mockRequestPayment,
        destroy: mockPaymentDestroy,
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

  it("AUTH-CHEER-02 비로그인은 같은 목표로 복귀하는 로그인 링크만 제공한다", () => {
    render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
        isAuthenticated={false}
      />,
    );

    expect(screen.getByRole("link", { name: "카카오 로그인 후 응원하기" }))
      .toHaveAttribute(
        "href",
        "/auth/kakao/start?redirect=%2Fg%2Fgoal-slug%23cheer",
      );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("VO-04 code-only 주문 오류는 클라이언트 카피로 표시한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { code: "invalid_amount" } }),
    }));
    render(<CheerPaymentButton goalId={11} goalTitle="편입 합격 해낼게" goalSlug="goal-slug" />);
    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("응원 금액을 다시 확인해 주세요.");
  });

  it("G4-PAY-01 결제창형 키에서 CARD 선택은 승인 요청한다", async () => {
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

  it("G4-PAY-01 결제창형 키에서 EASY_PAY 선택도 승인 요청한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_gck_contract");
    render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
        supporterName="이다솔"
      />,
    );
    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));
    await waitFor(() => expect(mockRenderPaymentWindow).toHaveBeenCalled());
    paymentWindowHandlers.get("paymentRequest")?.({
      paymentMethod: { method: "EASY_PAY", easyPay: { provider: "KAKAOPAY" } },
    });
    await waitFor(() => {
      expect(mockWidgetRequestPayment).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: "order-1" }),
      );
    });
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
      await screen.findByText(
        "카드 또는 간편결제를 선택해 주세요. 돈은 빠져나가지 않았어요.",
      ),
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
    fireEvent.click(screen.getByTestId("cheer-cta"));
    expect(screen.getByTestId("cheer-payment-submit")).toBeEnabled();
    expect(screen.getByTestId("cheer-payment-submit")).toHaveTextContent(
      "결제하고 응원하기",
    );
  });

  it("G4-PAY-01 일반 CARD SDK 로딩 중 시트를 닫으면 늦은 결제 요청을 열지 않는다", async () => {
    let resolveSdk!: (value: Awaited<ReturnType<typeof mockLoadTossPayments>>) => void;
    const pendingSdk = new Promise<Awaited<ReturnType<typeof mockLoadTossPayments>>>(
      (resolve) => {
        resolveSdk = resolve;
      },
    );
    mockLoadTossPayments.mockReturnValueOnce(pendingSdk);

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
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    resolveSdk({
      payment: () => ({
        requestPayment: mockRequestPayment,
        destroy: mockPaymentDestroy,
      }),
      widgets: () => ({
        setAmount: mockWidgetSetAmount,
        renderPaymentWindow: mockRenderPaymentWindow,
        requestPayment: mockWidgetRequestPayment,
      }),
    });

    await waitFor(() => expect(mockPaymentDestroy).toHaveBeenCalledTimes(1));
    expect(mockRequestPayment).not.toHaveBeenCalled();
  });

  it("G4-PAY-01 일반 CARD 결제 요청 중 시트 닫기와 unmount는 SDK를 한 번만 제거한다", async () => {
    let resolveRequest!: () => void;
    mockRequestPayment.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const view = render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
      />,
    );

    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));
    await waitFor(() => expect(mockRequestPayment).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    view.unmount();
    await waitFor(() => expect(mockPaymentDestroy).toHaveBeenCalledTimes(1));

    resolveRequest();
    await Promise.resolve();
    expect(mockPaymentDestroy).toHaveBeenCalledTimes(1);
  });

  it("G4-PAY-01 이전 결제창 렌더 완료가 새 시도의 핸들과 loading을 덮지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_gck_contract");
    const firstDestroy = vi.fn().mockResolvedValue(undefined);
    const secondDestroy = vi.fn().mockResolvedValue(undefined);
    let resolveFirstWindow!: (window: {
      on: (eventName: string, callback: (params?: unknown) => void) => void;
      destroy: typeof firstDestroy;
    }) => void;
    const firstWindow = new Promise<{
      on: (eventName: string, callback: (params?: unknown) => void) => void;
      destroy: typeof firstDestroy;
    }>((resolve) => {
      resolveFirstWindow = resolve;
    });
    mockRenderPaymentWindow
      .mockImplementationOnce(() => firstWindow)
      .mockResolvedValueOnce({
        on: (eventName: string, callback: (params?: unknown) => void) => {
          paymentWindowHandlers.set(eventName, callback);
        },
        destroy: secondDestroy,
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
    await waitFor(() => expect(mockRenderPaymentWindow).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    fireEvent.click(screen.getByTestId("cheer-cta"));
    fireEvent.click(screen.getByTestId("cheer-payment-submit"));
    await waitFor(() => expect(mockRenderPaymentWindow).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("cheer-payment-submit")).toBeDisabled();

    resolveFirstWindow({
      on: () => undefined,
      destroy: firstDestroy,
    });
    await waitFor(() => expect(firstDestroy).toHaveBeenCalledTimes(1));
    expect(secondDestroy).not.toHaveBeenCalled();
    expect(screen.getByTestId("cheer-payment-submit")).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(secondDestroy).toHaveBeenCalledTimes(1));
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

  it("G4-PAY-02 Toss SDK의 원문 오류는 노출하지 않고 다음 행동을 안내한다", async () => {
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
        "결제를 완료하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
      ),
    ).toBeVisible();
  });

  it("PAY-FAIL-05 네트워크 오류는 출금 여부 확인과 중복 결제 방지를 안내한다", async () => {
    mockRequestPayment.mockRejectedValue(new TypeError("Failed to fetch"));

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
        "결제 결과를 확인하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
      ),
    ).toBeVisible();
  });

  it("D057-NAME-02 로그인 회원 이름은 고정 표시되고 익명만 토글한다", () => {
    render(
      <CheerPaymentButton
        goalId={11}
        goalTitle="편입 합격 해낼게"
        goalSlug="goal-slug"
        supporterName="이다솔"
      />,
    );
    fireEvent.click(screen.getByTestId("cheer-cta"));
    expect(screen.getByTestId("cheer-supporter-name")).toHaveTextContent("이다솔");
    expect(screen.queryByPlaceholderText("친구에게 보일 이름")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("cheer-anonymous-toggle"));
    expect(screen.getByTestId("cheer-supporter-name")).toHaveTextContent(
      "익명으로 보낼게요",
    );
  });
});
