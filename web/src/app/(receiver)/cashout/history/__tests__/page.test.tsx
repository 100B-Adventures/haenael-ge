import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

describe("/cashout/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("P1-14 이력 RPC 오류는 내역 없음으로 위장하지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-uid" } },
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "history failed" },
      }),
    } as never);

    const { default: CashoutHistoryPage } = await import("../page");
    render(await CashoutHistoryPage());

    expect(screen.getByTestId("cashout-history-load-error")).toHaveTextContent(
      "환전 내역을 불러오지 못했어요",
    );
    expect(screen.getByText(/내역이 없다는 뜻이 아니에요/)).toBeInTheDocument();
    expect(screen.queryByText("아직 환전 내역이 없어요")).not.toBeInTheDocument();
  });
});
