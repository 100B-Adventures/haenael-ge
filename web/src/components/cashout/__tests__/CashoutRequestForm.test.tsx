import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashoutRequestForm } from "../CashoutRequestForm";

const { createCashoutRequest, trackEvent } = vi.hoisted(() => ({
  createCashoutRequest: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/app/(receiver)/cashout/actions", () => ({ createCashoutRequest }));
vi.mock("@/lib/analytics", () => ({ trackEvent }));

describe("CashoutRequestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCashoutRequest.mockResolvedValue({
      ok: true,
      data: {
        requestId: 71,
        status: "REQUESTED",
        cloverAmount: 30,
        grossKrw: 30_000,
        feeKrw: 0,
        withholdingKrw: 990,
        netKrw: 29_010,
        requestedAt: "2026-08-02T00:00:00.000Z",
        isReplay: false,
      },
    });
  });

  function renderForm(initialPhone: string | null = "01012345678") {
    return render(
      <CashoutRequestForm
        cashoutEnabled
        reachedThreshold
        payableAmount={40}
        minCashoutClover={30}
        currentCashout={null}
        history={[]}
        initialPhone={initialPhone}
      />,
    );
  }

  it("최종 확인 뒤 Server Action 한 곳으로만 신청하고 3.3% 실지급액을 표시한다", async () => {
    renderForm();
    expect(screen.getByTestId("cashout-live-preview")).toHaveTextContent(
      "30,000원 요청 → 원천징수 990원 → 29,010원 입금",
    );

    fireEvent.change(screen.getByLabelText("은행"), { target: { value: "KB" } });
    fireEvent.change(screen.getByLabelText("계좌번호"), { target: { value: "123-456-789012" } });
    fireEvent.change(screen.getByLabelText("예금주"), { target: { value: "홍길동" } });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));

    expect(screen.getByTestId("cashout-confirm-step")).toHaveTextContent("이 계좌가 맞나요?");
    expect(createCashoutRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("cashout-submit-button"));
    await waitFor(() => expect(createCashoutRequest).toHaveBeenCalledTimes(1));
    expect(createCashoutRequest).toHaveBeenCalledWith({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123-456-789012",
      accountHolder: "홍길동",
      phone: "01012345678",
      requestKey: expect.stringMatching(/^cashout_[a-z0-9]+$/),
    });
    expect(await screen.findByTestId("cashout-request-success")).toHaveTextContent("29,010원");
    expect(trackEvent).toHaveBeenCalledWith("cashout_initiated", {
      clover_amount: 30,
      status: "REQUESTED",
    });
  });

  it("저장된 전화번호를 미리 채우고 번호가 없으면 인라인에서 신청을 막는다", () => {
    const { unmount } = renderForm();
    expect(screen.getByLabelText("전화번호")).toHaveValue("01012345678");
    unmount();

    renderForm(null);
    expect(screen.getByTestId("phone-consent-notice")).toHaveTextContent(
      "환전 안내를 받을 전화번호가 필요해요",
    );
    expect(screen.getByTestId("phone-consent-cta")).toHaveAttribute(
      "href",
      "/auth/kakao/start?redirect=%2Fcashout",
    );
    fireEvent.change(screen.getByLabelText("은행"), { target: { value: "KB" } });
    fireEvent.change(screen.getByLabelText("계좌번호"), { target: { value: "123456789012" } });
    fireEvent.change(screen.getByLabelText("예금주"), { target: { value: "홍길동" } });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));

    expect(screen.getByRole("alert")).toHaveTextContent("전화번호를 숫자로 정확히 입력해주세요.");
    expect(screen.queryByTestId("cashout-confirm-step")).not.toBeInTheDocument();
    expect(createCashoutRequest).not.toHaveBeenCalled();
  });

  it("Server Action 예외 원문을 화면에 노출하지 않는다", async () => {
    createCashoutRequest.mockRejectedValueOnce(new Error("request body contained account"));
    renderForm();
    fireEvent.change(screen.getByLabelText("은행"), { target: { value: "KB" } });
    fireEvent.change(screen.getByLabelText("계좌번호"), { target: { value: "123456789012" } });
    fireEvent.change(screen.getByLabelText("예금주"), { target: { value: "홍길동" } });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));
    fireEvent.click(screen.getByTestId("cashout-submit-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "환전 신청 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
    );
    expect(screen.queryByText(/request body contained account/)).not.toBeInTheDocument();
  });

  it("진행 중 신청이 있으면 새 신청을 막고 상태 화면으로 연결한다", () => {
    render(
      <CashoutRequestForm
        cashoutEnabled
        reachedThreshold
        payableAmount={40}
        minCashoutClover={30}
        currentCashout={{
          id: 71,
          status: "REQUESTED",
          clover_amount: 30,
          net_krw: 29_010,
          bank_code: "KB",
          account_masked: "********9012",
          account_holder: "홍길동",
          requested_at: "2026-08-02T00:00:00.000Z",
          paid_at: null,
          rejected_at: null,
          processing_note: null,
        }}
        history={[]}
        initialPhone="01012345678"
      />,
    );
    expect(screen.getByTestId("cashout-pending-block")).toBeInTheDocument();
    expect(screen.queryByTestId("cashout-request-form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "진행 상태 보기" })).toHaveAttribute("href", "/cashout/status");
  });
});
