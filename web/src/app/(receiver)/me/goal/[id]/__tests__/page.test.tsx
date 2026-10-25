import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

describe("/me/goal/[id] 권한 경계", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockReset();
  });

  it("AUTH-GOAL-01 비로그인은 권한없음 상태를 보고 로그아웃 버튼은 보지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never);

    const { default: GoalManagementPage } = await import("../page");
    render(await GoalManagementPage({
      params: Promise.resolve({ id: "1" }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByTestId("goal-access-required")).toHaveTextContent(
      "권한이 필요한 화면이에요",
    );
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인하러 가기" })).toHaveAttribute("href", "/");
  }, 10_000);
});
