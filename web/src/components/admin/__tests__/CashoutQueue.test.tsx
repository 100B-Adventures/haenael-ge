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

  it("계좌는 기본 마스킹하고 명시적 클릭 뒤에만 전체 번호를 표시한다", async () => {
    render(<CashoutQueue cashouts={[cashout]} />);

    expect(screen.getAllByText(/••••••9012/).length).toBeGreaterThan(0);
    expect(screen.queryByText("123456789012")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "전체 계좌 보기" })[0]);

    await waitFor(() =>
      expect(revealCashoutAccount).toHaveBeenCalledWith(cashout.id),
    );
    expect((await screen.findAllByText(/123456789012/)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "다시 가리기" })[0]);
    expect(screen.queryByText("123456789012")).not.toBeInTheDocument();
    expect(screen.getAllByText(/••••••9012/).length).toBeGreaterThan(0);
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
});
