import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/social/contracts", () => ({
  asMySocialDashboard: vi.fn(),
}));
vi.mock("@/components/social/MyPageOverview", () => ({
  MyPageOverview: () => <div data-testid="my-page-overview" />,
}));
vi.mock("@/components/common/NotificationBadge", () => ({
  NotificationBadge: () => <button type="button" aria-label="알림" />,
}));
vi.mock("@/components/receiver/ReceiverShell", () => ({
  ReceiverPageShell: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { asMySocialDashboard } from "@/lib/social/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const dashboard = {
  profile: { nickname: "서연", bio: "한 걸음씩, 끝까지 함께해요", profile_image: null },
  goals: [],
  friend_count: 3,
  achievements: {
    completed_goal_count: 2,
    received_cheer_count: 7,
    connected_friend_count: 3,
  },
  belonging_queue: [],
  received_cheers: [],
  sent_cheers: [],
};

function mockClient(rpcError: Error | null = null) {
  const preferenceQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { notify_cheer: true, notify_marketing: false },
    }),
  };
  preferenceQuery.select.mockReturnValue(preferenceQuery);
  preferenceQuery.eq.mockReturnValue(preferenceQuery);
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-1" } } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: { ok: true }, error: rpcError }),
    from: vi.fn().mockReturnValue(preferenceQuery),
  } as never);
}

describe("/my 마이페이지 셸", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(asMySocialDashboard).mockReturnValue(dashboard);
  });

  it("MY-PAGE-01 승인 IA 제목을 쓰고 상단 로그아웃 중복을 노출하지 않는다", async () => {
    mockClient();
    const { default: MyPage } = await import("../page");
    render(await MyPage());

    const heading = screen.getByRole("heading", { name: "마이페이지" });
    const header = heading.closest("header");
    expect(header).not.toBeNull();
    expect(within(header as HTMLElement).getByRole("button", { name: "알림" }))
      .toBeInTheDocument();
    expect(within(header as HTMLElement).queryByRole("button", { name: "로그아웃" }))
      .not.toBeInTheDocument();
    expect(screen.getByTestId("my-page-overview")).toBeInTheDocument();
  });

  it("MY-PAGE-02 대시보드 오류는 마이페이지 복구 문구를 렌더한다", async () => {
    mockClient(new Error("dashboard_unavailable"));
    vi.mocked(asMySocialDashboard).mockReturnValue(null);
    const { default: MyPage } = await import("../page");
    render(await MyPage());

    expect(screen.getByTestId("my-page-error")).toHaveTextContent(
      "마이페이지를 불러오지 못했어요.",
    );
    expect(screen.getByText("잠시 뒤 다시 시도해 주세요.")).toBeInTheDocument();
  });
});
