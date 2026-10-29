import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashoutQueue, type AdminCashout } from "../CashoutQueue";

const { revealCashoutAccount, markCashoutPaid, rejectCashout, refresh } = vi.hoisted(() => ({
  revealCashoutAccount: vi.fn(),
  markCashoutPaid: vi.fn(),
  rejectCashout: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/admin/actions", () => ({
  revealCashoutAccount,
  markCashoutPaid,
  rejectCashout,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const cashout: AdminCashout = {
  id: 71,
  member_id: "ca500000-0000-0000-0000-000000000001",
  nickname: "환전회원",
  clover_amount: 30,
  gross_krw: 30_000,
  fee_krw: 0,
  withholding_krw: 990,
  net_krw: 29_010,
  bank_code: "KB",
  account_masked: "••••••9012",
  account_holder: "홍길동",
  status: "REQUESTED",
  processing_note: null,
  requested_at: "2026-07-28T09:00:00.000Z",
  paid_at: null,
  rejected_at: null,
};

describe("CashoutQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revealCashoutAccount.mockResolvedValue({
      ok: true,
      accountNo: "123456789012",
    });
    markCashoutPaid.mockResolvedValue({ ok: true });
    rejectCashout.mockResolvedValue({ ok: true });
  });

  it("ADMIN-COPY-01 요청자 내부 식별자를 화면에 노출하지 않는다", () => {
    render(<CashoutQueue cashouts={[cashout]} />);

    expect(screen.getAllByText("환전회원").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain(cashout.member_id);
    expect(document.body.textContent).not.toContain("ca500000");
  });

  it("ADMIN-VISUAL-01 지급 대기 상태는 강조 배경 없이 muted text로 표시한다", () => {
    render(<CashoutQueue cashouts={[cashout]} />);

    const status = screen.getByText("지급 예정");
    expect(status).toHaveClass("text-muted-foreground");
    expect(status).not.toHaveClass("bg-amber-soft", "text-amber-ink");
  });

  it("전체 계좌는 지급 확인 모달에서만 감사 로그와 함께 표시한다", async () => {
    render(<CashoutQueue cashouts={[cashout]} />);

    expect(screen.getAllByText(/••••••9012/).length).toBeGreaterThan(0);
    expect(screen.queryByText("123456789012")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "지급 완료" })[0]);

    await waitFor(() =>
      expect(revealCashoutAccount).toHaveBeenCalledWith(cashout.id),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("123456789012");
    expect(dialog).toHaveTextContent("친구 응원분");
    expect(dialog).toHaveTextContent("원천징수");
    expect(document.body).not.toHaveTextContent("전체 계좌 보기");
  });

  it("지급 완료는 실제 이체 확인 체크 전에는 확정할 수 없다", async () => {
    render(<CashoutQueue cashouts={[cashout]} />);

    fireEvent.click(screen.getAllByRole("button", { name: "지급 완료" })[0]);
    const confirmButton = await screen.findByRole("button", { name: "지급 완료 확정" });
    expect(revealCashoutAccount).toHaveBeenCalledWith(cashout.id);
    expect(screen.getByRole("dialog")).toHaveTextContent("KB 123456789012");
    expect(screen.getByRole("dialog")).not.toHaveTextContent(cashout.account_masked!);
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() => expect(markCashoutPaid).toHaveBeenCalledWith(cashout.id, ""));
    expect(refresh).toHaveBeenCalled();
  });

  // 컨트롤러 재검증 MAJOR3: A안에서 반려는 잠금 해제일 뿐이고 되돌릴 잔액이 없다.
  // §8.2 폐기어("보류"·"복원")가 버튼·경고문 어디에도 남으면 안 된다.
  it("반려 모달은 '복원'이 아니라 '잠금 해제'를 말하고, 버튼도 같은 사실을 말한다", async () => {
    render(<CashoutQueue cashouts={[cashout]} />);

    fireEvent.click(screen.getAllByRole("button", { name: "반려" })[0]);
    const dialog = await screen.findByRole("dialog");

    const warning = screen.getByTestId("cashout-reject-warning");
    expect(warning).toHaveTextContent(
      `반려하면 친구 응원분 🍀${cashout.clover_amount}개에 걸린 잠금이 풀려요. 총량은 애초에 줄지 않았으므로 되돌릴 잔액이 없습니다. 신청자는 사유를 보고 다시 신청할 수 있어요.`,
    );
    expect(dialog.textContent).not.toMatch(/보류|복원/);

    fireEvent.change(screen.getByLabelText(/반려 사유/), { target: { value: "예금주 불일치" } });
    const confirmButton = screen.getByTestId("cashout-modal-confirm-button");
    expect(confirmButton).toHaveTextContent("반려하고 잠금 해제");

    fireEvent.click(confirmButton);
    await waitFor(() => expect(rejectCashout).toHaveBeenCalledWith(cashout.id, "예금주 불일치"));
  });

  it("CP-04 처리 이력은 8건 초과일 때만 공용 Collapsible로 접는다", async () => {
    const handled = Array.from({ length: 9 }, (_, index) => ({
      ...cashout,
      id: 100 + index,
      nickname: `처리회원${index + 1}`,
      status: "PAID",
    }));
    render(<CashoutQueue cashouts={handled} />);

    expect(screen.getAllByTestId("cashout-request-card")).toHaveLength(8);
    const toggle = screen.getByRole("button", { name: "처리한 요청 펼치기" });
    fireEvent.click(toggle);
    expect(screen.getAllByTestId("cashout-request-card")).toHaveLength(9);
    expect(toggle).toHaveAccessibleName("처리한 요청 접기");
  });

  it("CP-04 처리 이력이 8건 이하면 접지 않고 전부 표시한다", () => {
    const handled = Array.from({ length: 8 }, (_, index) => ({
      ...cashout,
      id: 200 + index,
      nickname: `처리회원${index + 1}`,
      status: "PAID",
    }));
    render(<CashoutQueue cashouts={handled} />);

    expect(screen.getAllByTestId("cashout-request-card")).toHaveLength(8);
    expect(
      screen.queryByRole("button", { name: /처리한 요청 (?:펼치기|접기)/ }),
    ).not.toBeInTheDocument();
  });
});
