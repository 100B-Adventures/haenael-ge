import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashoutQueue, type AdminCashout } from "../CashoutQueue";

const { revealCashoutAccount, refresh } = vi.hoisted(() => ({
  revealCashoutAccount: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/admin/actions", () => ({
  revealCashoutAccount,
  markCashoutPaid: vi.fn(),
  rejectCashout: vi.fn(),
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
  });

  it("계좌는 기본 마스킹하고 명시적 클릭 뒤에만 전체 번호를 표시한다", async () => {
    render(<CashoutQueue cashouts={[cashout]} />);

    expect(screen.getByText("••••••9012")).toBeInTheDocument();
    expect(screen.queryByText("123456789012")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "전체 계좌 보기" }));

    await waitFor(() =>
      expect(revealCashoutAccount).toHaveBeenCalledWith(cashout.id),
    );
    expect(await screen.findByText("123456789012")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다시 가리기" }));
    expect(screen.queryByText("123456789012")).not.toBeInTheDocument();
    expect(screen.getByText("••••••9012")).toBeInTheDocument();
  });
});
