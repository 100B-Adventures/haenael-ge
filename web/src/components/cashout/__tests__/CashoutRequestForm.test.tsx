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
        feeKrw: 3_300,
        withholdingKrw: 881,
        netKrw: 25_819,
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
        totalBalance={40}
        minCashoutClover={30}
        currentCashout={null}
        history={[]}
        initialPhone={initialPhone}
      />,
    );
  }

  it("최종 확인 뒤 신청하고 서버 재검증 후에도 접수 성공 화면을 유지한다", async () => {
    const view = renderForm();
    expect(screen.getByTestId("cashout-live-preview")).toHaveTextContent(
      "30,000원 요청 → 서비스 이용료 3,300원 · 원천징수 881원 → 25,819원 입금",
    );

    fireEvent.change(screen.getByLabelText("은행"), { target: { value: "KB" } });
    fireEvent.change(screen.getByLabelText("계좌번호"), { target: { value: "123-456-789012" } });
    fireEvent.change(screen.getByLabelText("예금주"), { target: { value: "홍길동" } });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));

    expect(screen.getByTestId("cashout-confirm-step")).toHaveTextContent("보내는 곳");
    expect(createCashoutRequest).not.toHaveBeenCalled();

    // MAJOR2 회귀(컨트롤러 재검증): 정본 = 프로토 v3.6 확인 배너. A안 3단 예고 중
    // ①단계("입금이 끝나면 그때 N개가 빠져요")를 확인 화면이 지켜야 하고, §8.2가
    // 폐기한 "돌아옵니다"·"환전 진행중"은 화면 어디에도 남으면 안 된다.
    const confirmBanner = screen.getByTestId("cashout-confirm-banner");
    expect(confirmBanner).toHaveTextContent("신청하면 클로버 30개가 잠겨요");
    expect(confirmBanner).toHaveTextContent(
      "모은 40개는 그대로 남고, 그중 30개에만 잠금이 걸려요. 입금이 끝나면 그때 30개가 빠져요. 반려되면 잠금이 풀립니다.",
    );
    expect(confirmBanner.textContent).not.toMatch(/돌아옵니다|환전 진행중|보류|복원/);

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
    expect(await screen.findByTestId("cashout-request-success")).toHaveTextContent(
      "국민은행 ********9012 (홍길동)",
    );
    expect(screen.getByTestId("cashout-request-success")).toHaveTextContent("25,819원");
    expect(trackEvent).toHaveBeenCalledWith("cashout_initiated", {
      clover_amount: 30,
      status: "REQUESTED",
    });

    // revalidatePath()가 갱신한 RSC payload는 client state를 보존하면서
    // currentCashout=REQUESTED props를 전달한다. 이때 성공 확인이 대기 블록에
    // 덮이지 않아야 사용자가 접수 결과와 마스킹 계좌를 끝까지 확인할 수 있다.
    view.rerender(
      <CashoutRequestForm
        cashoutEnabled
        reachedThreshold
        payableAmount={10}
        totalBalance={40}
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
        initialPhone="01099998888"
      />,
    );

    expect(screen.getByTestId("cashout-request-success")).toHaveTextContent(
      "국민은행 ********9012 (홍길동)",
    );
    expect(screen.queryByTestId("cashout-pending-block")).not.toBeInTheDocument();
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

    expect(screen.getByRole("alert")).toHaveTextContent("입금 완료 안내를 받을 휴대전화 번호를 입력해 주세요.");
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

  it("TC-LD-01 정상 경로: 제출 중 작업명과 중복 방지 안내를 보여주고 재입력을 잠근다", async () => {
    let resolveRequest!: (value: unknown) => void;
    createCashoutRequest.mockReturnValueOnce(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    renderForm();
    fireEvent.change(screen.getByLabelText("은행"), { target: { value: "KB" } });
    fireEvent.change(screen.getByLabelText("계좌번호"), { target: { value: "123456789012" } });
    fireEvent.change(screen.getByLabelText("예금주"), { target: { value: "홍길동" } });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));
    fireEvent.click(screen.getByTestId("cashout-submit-button"));

    const loading = await screen.findByTestId("cashout-submitting-state");
    expect(screen.getByTestId("cashout-confirm-step")).toHaveAttribute("aria-busy", "true");
    expect(loading).toHaveTextContent("환전 신청 제출 중");
    expect(loading).toHaveTextContent("같은 신청이 두 번 들어가지 않습니다");
    expect(screen.queryByRole("button", { name: "계좌 다시 입력" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("cashout-submit-button")).not.toBeInTheDocument();

    resolveRequest({
      ok: true,
      data: {
        requestId: 71,
        status: "REQUESTED",
        cloverAmount: 30,
        grossKrw: 30_000,
        feeKrw: 3_300,
        withholdingKrw: 881,
        netKrw: 25_819,
        requestedAt: "2026-08-02T00:00:00.000Z",
        isReplay: false,
      },
    });
    expect(await screen.findByTestId("cashout-request-success")).toBeInTheDocument();
  });

  it("TC-LD-01 거절 경로: 제출 실패 뒤 로딩을 닫고 재시도 가능한 확인 화면으로 돌아온다", async () => {
    createCashoutRequest.mockRejectedValueOnce(new Error("network down"));
    renderForm();
    fireEvent.change(screen.getByLabelText("은행"), { target: { value: "KB" } });
    fireEvent.change(screen.getByLabelText("계좌번호"), { target: { value: "123456789012" } });
    fireEvent.change(screen.getByLabelText("예금주"), { target: { value: "홍길동" } });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));
    fireEvent.click(screen.getByTestId("cashout-submit-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent("환전 신청 서버에 연결하지 못했어요");
    expect(screen.queryByTestId("cashout-submitting-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("cashout-submit-button")).toBeInTheDocument();
  });

  it("QA-LOCAL-03 거절 경로: 최소 수량 미만은 브라우저 문구 대신 한국어 행동 안내를 보여준다", () => {
    renderForm();
    const cloverInput = screen.getByLabelText("환전할 클로버") as HTMLInputElement;
    fireEvent.change(cloverInput, { target: { value: "29" } });
    fireEvent.click(screen.getByTestId("cashout-confirm-button"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "환전하려면 클로버가 최소 30개 필요해요. 30개 이상 입력해 주세요.",
    );
    expect(cloverInput.validationMessage).toBe(
      "환전하려면 클로버가 최소 30개 필요해요. 30개 이상 입력해 주세요.",
    );
    expect(screen.queryByTestId("cashout-confirm-step")).not.toBeInTheDocument();
  });

  it("진행 중 신청이 있으면 새 신청을 막고 상태 화면으로 연결한다", () => {
    render(
      <CashoutRequestForm
        cashoutEnabled
        reachedThreshold
        payableAmount={40}
        totalBalance={40}
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
