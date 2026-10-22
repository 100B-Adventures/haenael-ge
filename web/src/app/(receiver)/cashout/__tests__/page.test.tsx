import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const { isCashoutAllowedMember } = vi.hoisted(() => ({
  isCashoutAllowedMember: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({ isCashoutAllowedMember }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function cashoutClient(failingDependency?: string) {
  const rpc = vi.fn().mockImplementation((name: string) => {
    if (name === failingDependency) {
      return Promise.resolve({ data: null, error: { message: `${name} failed` } });
    }
    if (name === "clover_eligibility") {
      if (failingDependency === "clover_eligibility_empty") {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({
        data: [{ total_balance: 8, welcome_amount: 3, payable_amount: 5, min_cashout_clover: 30, reached_threshold: false }],
        error: null,
      });
    }
    return Promise.resolve({ data: [], error: null });
  });
  return {
    rpc,
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-uid" } },
        }),
      },
      rpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue(
              failingDependency === "member"
                ? { data: null, error: { message: "member failed" } }
                : { data: { phone: "01012345678" }, error: null },
            ),
          })),
        })),
      })),
    },
  };
}

describe("/cashout 미달 상태", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCashoutAllowedMember.mockReturnValue(true);

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      cashoutClient().client as never,
    );
  });

  it(
    "미달 안내와 분해 미리보기를 함께 보여주고 신청 버튼만 막는다",
    async () => {
      const { default: CashoutPage } = await import("../page");
      render(await CashoutPage());

      expect(screen.getByTestId("cashout-below-threshold-banner")).toHaveTextContent(
        "22개",
      );
      expect(screen.getByTestId("cashout-breakdown-table")).toBeInTheDocument();
      expect(screen.getByTestId("cashout-net-preview")).toBeInTheDocument();
      expect(screen.getByTestId("cashout-confirm-disabled")).toBeInTheDocument();
      expect(screen.queryByTestId("cashout-confirm-button")).not.toBeInTheDocument();
    },
    15_000,
  );

  it("P0-01 일반 계정은 기존 돈 상태를 회수하되 신청 폼은 서버 판정으로 닫는다", async () => {
    isCashoutAllowedMember.mockReturnValueOnce(false);
    const supabase = await createServerSupabaseClient();
    const rpc = supabase.rpc as ReturnType<typeof vi.fn>;

    const { default: CashoutPage } = await import("../page");
    render(await CashoutPage());

    expect(screen.getByTestId("cashout-page")).toBeInTheDocument();
    expect(screen.getByTestId("cashout-breakdown-table")).toBeInTheDocument();
    expect(screen.getByTestId("cashout-confirm-disabled")).toHaveTextContent(
      "환전 기능을 준비하고 있어요",
    );
    expect(screen.queryByTestId("cashout-request-form")).not.toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("clover_eligibility", { p_member_id: "owner-uid" });
  });

  it.each([
    "clover_eligibility",
    "clover_eligibility_empty",
    "my_cashout_status",
    "my_cashout_history",
  ])("P1-14 %s 조회 실패는 0원이나 빈 상태로 위장하지 않는다", async (dependency) => {
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      cashoutClient(dependency).client as never,
    );

    const { default: CashoutPage } = await import("../page");
    render(await CashoutPage());

    expect(screen.getByTestId("cashout-load-error")).toHaveTextContent(
      "잔액이 0이라는 뜻이 아니에요",
    );
    expect(screen.queryByTestId("cashout-breakdown-table")).not.toBeInTheDocument();
  });

  it("전화번호 조회 실패는 돈 상태 화면을 막지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce(
      cashoutClient("member").client as never,
    );

    const { default: CashoutPage } = await import("../page");
    render(await CashoutPage());

    expect(screen.queryByTestId("cashout-load-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("cashout-breakdown-table")).toBeInTheDocument();
  });
});
