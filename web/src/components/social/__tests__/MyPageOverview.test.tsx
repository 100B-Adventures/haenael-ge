import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyPageOverview } from "../MyPageOverview";

const updatePreferences = vi.fn(
  async (_notifyCheer: boolean, _notifyMarketing: boolean) => ({
    ok: true as const,
    data: undefined,
  }),
);
vi.mock("@/app/(receiver)/social-actions", () => ({
  updateMemberPreferencesAction: (notifyCheer: boolean, notifyMarketing: boolean) =>
    updatePreferences(notifyCheer, notifyMarketing),
}));

const dashboard = {
  profile: { nickname: "서연", profile_image: null },
  goals: [{
    goal_id: 1,
    slug: "run",
    title: "매주 세 번 달리기",
    due_date: "2026-12-01",
    status: "ACTIVE" as const,
    cover_preset_key: "c1",
  }],
  friend_count: 3,
  achievements: {
    completed_goal_count: 2,
    received_cheer_count: 7,
    connected_friend_count: 3,
  },
  belonging_queue: [],
};

const preferences = { notifyCheer: true, notifyMarketing: false };

describe("MyPageOverview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("MY-UI-01 프로토타입 순서대로 프로필, 활동, 응원 내역, 환경설정, 계정을 렌더한다", () => {
    render(
      <MyPageOverview dashboard={dashboard} initialPreferences={preferences} />,
    );
    const text = screen.getByTestId("my-page-overview").textContent ?? "";
    expect(screen.getByTestId("my-profile-summary")).toHaveTextContent("서연");
    expect(screen.getByRole("link", { name: /업적/ })).toHaveAttribute(
      "href",
      "/me/achievements",
    );
    expect(screen.getByRole("link", { name: /환전 내역/ })).toHaveAttribute(
      "href",
      "/cashout/history",
    );
    expect(text.indexOf("나의 활동")).toBeLessThan(text.indexOf("응원 내역"));
    expect(text.indexOf("응원 내역")).toBeLessThan(text.indexOf("환경설정"));
    expect(text.indexOf("환경설정")).toBeLessThan(text.indexOf("계정"));
    expect(text).not.toMatch(/\d[\d,]*원|₩/);
  });

  it("MY-UI-02 받은 응원과 보낸 응원 탭을 전환한다", async () => {
    render(
      <MyPageOverview dashboard={dashboard} initialPreferences={preferences} />,
    );
    expect(screen.getByText("받은 응원 7번")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "보낸 응원" }));
    expect(screen.getByText("내가 응원한 친구")).toBeInTheDocument();
  });

  it("MY-UI-03 알림 설정은 실제 RPC 액션에 연결된다", async () => {
    render(
      <MyPageOverview dashboard={dashboard} initialPreferences={preferences} />,
    );
    await userEvent.click(screen.getByRole("switch", { name: "응원 도착 알림" }));
    expect(updatePreferences).toHaveBeenCalledWith(false, false);
  });

  it("MY-UI-04 받은 응원 탭은 승인 시안처럼 개별 메시지를 표시한다", () => {
    render(
      <MyPageOverview
        dashboard={dashboard}
        receivedCheers={[{
          id: 10,
          displayName: "도경",
          message: "이번 주도 해낼 수 있어요.",
          createdAt: "2026-10-15T00:00:00Z",
        }]}
        initialPreferences={preferences}
      />,
    );

    expect(screen.getByText("도경")).toBeInTheDocument();
    expect(screen.getByText(/이번 주도 해낼 수 있어요/)).toBeInTheDocument();
    expect(screen.getByText("🍀 1번")).toBeInTheDocument();
  });
});
