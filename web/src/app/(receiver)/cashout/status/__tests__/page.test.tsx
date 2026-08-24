// status/page.test.tsx — 컨트롤러 재검증 MAJOR1·MAJOR4 회귀.
// MAJOR1: 입금완료 배너의 "감소 전" 숫자는 라이브 총량에서 역산하지 않고
//         my_cashout_status의 settled_balance_before/after 원장 스냅샷을 그대로 쓴다.
// MAJOR4: 잠김이 있는 화면은 SplitBalanceCard(분할 막대 + 두 줄 라벨)를 그린다.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function mockSupabase(rpcImpl: (name: string) => unknown) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-uid" } } }),
    },
    rpc: vi.fn().mockImplementation((name: string) => Promise.resolve(rpcImpl(name))),
  } as never);
}

describe("/cashout/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("MAJOR1: PAID 배너는 라이브 총량 역산이 아니라 원장 스냅샷(settled_balance_before/after)을 쓴다", async () => {
    // 지급 후 응원이 더 도착해 라이브 총량(clover_eligibility)이 12가 아니라 22로
    // 늘어난 상황을 재현한다. beforeBalance를 "라이브 총량 + clover_amount"로
    // 역산했다면 이 시나리오에서 62라는 존재한 적 없는 숫자가 나온다.
    mockSupabase((name) => {
      if (name === "my_cashout_status") {
        return {
          data: [
            {
              id: 20,
              status: "PAID",
              clover_amount: 40,
              net_krw: 34426,
              bank_code: "KB",
              account_masked: "••••••6789",
              account_holder: "스모크 회원",
              requested_at: "2026-08-21T00:00:00.000Z",
              paid_at: "2026-08-21T01:00:00.000Z",
              rejected_at: null,
              processing_note: null,
              settled_balance_before: 52,
              settled_balance_after: 12,
            },
          ],
          error: null,
        };
      }
      if (name === "clover_eligibility") {
        return {
          data: [
            {
              total_balance: 22,
              welcome_amount: 0,
              locked_amount: 0,
              available_amount: 22,
              payable_amount: 22,
              min_cashout_clover: 30,
              reached_threshold: false,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const { default: CashoutStatusPage } = await import("../page");
    render(await CashoutStatusPage());

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("모인 클로버가 52개에서 12개가 됐어요");
    expect(banner.textContent).not.toMatch(/62개/);
  });

  it("TC-STATUS-01~04: REQUESTED 상태는 분할 잔액·단계 시각·카드 안내·비활성 재신청·홈 경로를 렌더한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-21T01:00:00.000Z"));
    mockSupabase((name) => {
      if (name === "my_cashout_status") {
        return {
          data: [
            {
              id: 21,
              status: "REQUESTED",
              clover_amount: 40,
              net_krw: 34426,
              bank_code: "KB",
              account_masked: "••••••6789",
              account_holder: "스모크 회원",
              requested_at: "2026-08-21T00:00:00.000Z",
              paid_at: null,
              rejected_at: null,
              processing_note: null,
              settled_balance_before: null,
              settled_balance_after: null,
            },
          ],
          error: null,
        };
      }
      if (name === "clover_eligibility") {
        return {
          data: [
            {
              total_balance: 52,
              welcome_amount: 3,
              locked_amount: 40,
              available_amount: 12,
              payable_amount: 9,
              min_cashout_clover: 30,
              reached_threshold: true,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    const { default: CashoutStatusPage } = await import("../page");
    render(await CashoutStatusPage());

    const balanceCard = screen.getByTestId("status-balance-card");
    expect(balanceCard).toHaveTextContent("🍀 52");
    const block = screen.getByTestId("split-balance-block");
    expect(block).toHaveTextContent("지금 쓸 수 있어요");
    expect(block).toHaveTextContent("🔒 환전으로 잠김");
    expect(screen.getByTestId("split-balance-available")).toHaveTextContent("🍀 12개");
    expect(screen.getByTestId("split-balance-locked")).toHaveTextContent("🍀 40개");
    expect(screen.getByText("8/21 09:00")).toBeInTheDocument();
    expect(screen.getAllByText("예정")).toHaveLength(2);
    expect(screen.getByTestId("cashout-step-note")).toHaveTextContent("지금은 확인 대기 중이에요. 따로 하실 일은 없어요.");

    const nextCashoutButton = screen.getByRole("button", { name: /새 환전 신청하기/ });
    expect(nextCashoutButton).toBeDisabled();
    expect(nextCashoutButton).toHaveTextContent("이 건이 끝나면 다시 신청할 수 있어요");
    expect(screen.queryByRole("link", { name: "환전 내역 보기" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/me");
  });
});
