import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@/components/receiver/ReceiverShell", () => ({
  ReceiverPageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  ReceiverTopBar: () => <header>업적</header>,
  ReceiverBrandMark: () => <span>해낼게.</span>,
  BackHomeLink: ({ label }: { label: string }) => <a href="/my">{label}</a>,
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ""} {...props} />
  ),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function dashboard(completed: number, cheers: number, friends: number) {
  return {
    profile: { nickname: "서연", bio: null, profile_image: null },
    goals: [],
    received_cheers: [],
    sent_cheers: [],
    friend_count: friends,
    achievements: {
      completed_goal_count: completed,
      received_cheer_count: cheers,
      connected_friend_count: friends,
    },
    belonging_queue: [],
  };
}

function mockClient(data: ReturnType<typeof dashboard>) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "member-1" } } }),
    },
    rpc: vi.fn().mockResolvedValue({ data, error: null }),
  } as never);
}

describe("/me/achievements 업적 진열대", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TC-ACH-01 DB 집계로 히어로, 다음 메달 진행률, 잠금 진열대를 계산한다", async () => {
    mockClient(dashboard(2, 18, 3));
    const { default: AchievementsPage } = await import("../page");
    render(await AchievementsPage());

    expect(screen.getByText("모은 업적 4개")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "4번째 메달을 받았어요" }))
      .toBeInTheDocument();
    const next = screen.getByTestId("achievement-next-medal");
    expect(within(next).getByText("세 목표 완료")).toBeInTheDocument();
    expect(within(next).getAllByText("2 / 3")).toHaveLength(2);
    expect(within(next).getByRole("progressbar")).toHaveValue(2);
    expect(screen.getAllByLabelText("잠김")).toHaveLength(2);
  });

  it("TC-ACH-02 모든 DB 임계값을 채우면 다음 메달 대신 완료 상태를 보여준다", async () => {
    mockClient(dashboard(3, 20, 3));
    const { default: AchievementsPage } = await import("../page");
    render(await AchievementsPage());

    expect(screen.getByText("모은 업적 6개")).toBeInTheDocument();
    expect(screen.queryByTestId("achievement-next-medal")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("현재 메달을 모두 모았어요");
    expect(screen.queryByLabelText("잠김")).not.toBeInTheDocument();
  });
});
