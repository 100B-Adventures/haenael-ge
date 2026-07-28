import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("/cashout 미달 상태", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CASHOUT_ENABLED", "true");
    const historyQuery = {
      select: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    historyQuery.select.mockReturnValue(historyQuery);
    historyQuery.order.mockReturnValue(historyQuery);

    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-uid" } },
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            total_balance: 8,
            welcome_amount: 3,
            payable_amount: 5,
            min_cashout_clover: 30,
            reached_threshold: false,
          },
        ],
        error: null,
      }),
      from: vi.fn().mockReturnValue(historyQuery),
    } as never);
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
});
