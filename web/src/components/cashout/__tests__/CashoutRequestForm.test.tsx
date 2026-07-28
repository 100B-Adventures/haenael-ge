import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashoutRequestForm } from "../CashoutRequestForm";

const { invoke, trackEvent } = vi.hoisted(() => ({
  invoke: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    functions: { invoke },
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent,
}));

describe("CashoutRequestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoke.mockResolvedValue({
      data: {
        requestId: 71,
        status: "REQUESTED",
        grossKrw: 30_000,
        withholdingKrw: 990,
        netKrw: 29_010,
      },
      error: null,
    });
  });

  it("3.3% 실지급 미리보기와 정규화한 계좌정보로 요청한다", async () => {
    render(
      <CashoutRequestForm
        cashoutEnabled
        reachedThreshold
        payableAmount={40}
        minCashoutClover={30}
        history={[]}
      />,
    );

    expect(screen.getByTestId("cashout-live-preview")).toHaveTextContent(
      "30,000원 요청 → 원천징수 990원 → 29,010원 입금",
    );

    fireEvent.change(screen.getByLabelText("은행"), {
      target: { value: "KB" },
    });
    fireEvent.change(screen.getByLabelText("계좌번호"), {
      target: { value: "123-456-789012" },
    });
    fireEvent.change(screen.getByLabelText("예금주"), {
      target: { value: "홍길동" },
    });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));

    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke).toHaveBeenCalledWith(
      "cashout",
      expect.objectContaining({
        body: expect.objectContaining({
          mode: "request",
          cloverAmount: 30,
          bankCode: "KB",
          accountNo: "123456789012",
          accountHolder: "홍길동",
          requestKey: expect.stringMatching(/^cashout_[a-z0-9]+$/),
        }),
      }),
    );
    expect(screen.getByTestId("cashout-request-success")).toHaveTextContent(
      "29,010원 입금 예정",
    );
    expect(trackEvent).toHaveBeenCalledWith("cashout_initiated", {
      clover_amount: 30,
      status: "REQUESTED",
    });
  });

  it("서버 연결 예외를 민감정보 없이 사용자용 오류로 바꾼다", async () => {
    invoke.mockRejectedValueOnce(new Error("request body contained account"));
    render(
      <CashoutRequestForm
        cashoutEnabled
        reachedThreshold
        payableAmount={30}
        minCashoutClover={30}
        history={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("은행"), {
      target: { value: "KB" },
    });
    fireEvent.change(screen.getByLabelText("계좌번호"), {
      target: { value: "123456789012" },
    });
    fireEvent.change(screen.getByLabelText("예금주"), {
      target: { value: "홍길동" },
    });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));

    expect(
      await screen.findByText(
        "환전 신청 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/request body contained account/)).not.toBeInTheDocument();
  });
});
