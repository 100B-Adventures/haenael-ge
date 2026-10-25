import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AccountWithdrawalButton } from "../AccountWithdrawalButton";

const mockRpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc: mockRpc }) }));

describe("AccountWithdrawalButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: { eligible: true, clover_balance: 0, pending_cashout_count: 0, support_request_required: true, blocked_reasons: {} }, error: null });
  });

  it("ACCOUNT-01 회원 탈퇴 진입은 서버 확인 뒤 고객센터 접수와 개인정보처리방침을 안내한다", async () => {
    render(<AccountWithdrawalButton />);
    fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    expect(await screen.findByRole("dialog")).toContainElement(screen.getByText(/고객센터 문의로 접수/));
    expect(mockRpc).toHaveBeenCalledWith("account_withdrawal_eligibility");
    expect(screen.getByRole("link", { name: "개인정보처리방침 확인" })).toHaveAttribute("href", "/privacy");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ACCOUNT-02 잔액과 진행 중 환전이 있으면 정확한 차단사유를 표시한다", async () => {
    mockRpc.mockResolvedValue({ data: { eligible: false, clover_balance: 4, pending_cashout_count: 1, support_request_required: true, blocked_reasons: { clover_balance: "nonzero_clover_balance", cashout: "cashout_in_progress" } }, error: null });
    render(<AccountWithdrawalButton />);
    fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    expect(await screen.findByText("남은 클로버를 먼저 환전하거나 정리해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("진행 중인 환전이 끝난 뒤 탈퇴를 접수해 주세요.")).toBeInTheDocument();
  });
});
