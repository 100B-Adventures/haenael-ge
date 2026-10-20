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
    cheer_count: 1,
    supporter_avatars: [{ profile_image: null, is_anonymous: true }],
    recent_cheer: {
      supporter_name: null,
      message: "끝까지 응원해요.",
      created_at: "2026-10-20T00:00:00Z",
      is_anonymous: true,
    },
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

  it("MY-UI-01 관리 화면은 내 해낼게, 활동, 응원, 설정, 계정 순서로 렌더한다", () => {
    render(
      <MyPageOverview
        dashboard={dashboard}
        initialPreferences={preferences}
        goalCheerCounts={{ 1: 35 }}
        goalReasons={{ 1: "교환학생 지원 전에 점수를 만들고 싶어요." }}
      />,
    );
    const text = screen.getByTestId("my-page-overview").textContent ?? "";
    expect(screen.getByTestId("my-profile-summary")).toHaveTextContent("서연");
    expect(screen.getByText("내 해낼게")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^공유하기$/ })).toHaveAttribute("href", "/g/run");
    expect(screen.getByText("35명이 응원했어요")).toBeInTheDocument();
    expect(screen.getByText(/교환학생 지원 전에/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /업적/ })).toHaveAttribute(
      "href",
      "/me/achievements",
    );
    expect(screen.getByRole("link", { name: /업적/ })).toHaveTextContent(
      "완료 목표 2개 · 받은 응원 7개 · 친구 3명",
    );
    expect(screen.getByRole("link", { name: /환전 내역/ })).toHaveAttribute(
      "href",
      "/cashout/history",
    );
    expect(text.indexOf("나의 활동")).toBeLessThan(text.indexOf("응원 내역"));
    expect(text.indexOf("응원 내역")).toBeLessThan(text.indexOf("환경설정"));
    expect(text.indexOf("환경설정")).toBeLessThan(text.indexOf("계정"));
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "사업자 정보" })).toHaveAttribute("href", "/my/legal");
    expect(text).not.toMatch(/\d[\d,]*원|₩/);
  });

  it("MY-UI-02 받은 응원과 보낸 응원 탭을 전환한다", async () => {
    render(
      <MyPageOverview dashboard={dashboard} initialPreferences={preferences} />,
    );
    expect(screen.getByTestId("received-cheers-empty")).toHaveTextContent("첫 응원을 받아볼까요?");
    expect(screen.getByRole("link", { name: "응원 링크 공유하기" })).toHaveAttribute("href", "/me");
    await userEvent.click(screen.getByRole("tab", { name: "보낸 응원" }));
    expect(screen.getByText("내가 응원한 친구")).toBeInTheDocument();
  });

  it("MY-UI-05 목표 0개면 다음 행동이 있는 빈 상태를 보여준다", () => {
    render(
      <MyPageOverview
        dashboard={{ ...dashboard, goals: [] }}
        initialPreferences={preferences}
      />,
    );

    expect(screen.getByTestId("my-goals-empty")).toHaveTextContent("첫 해낼게를 만들어보세요");
    expect(screen.getAllByRole("link", { name: "해낼게 만들기" })[0])
      .toHaveAttribute("href", "/onboarding");
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
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        }]}
        initialPreferences={preferences}
      />,
    );

    expect(screen.getByText("도경")).toBeInTheDocument();
    expect(screen.getByText(/이번 주도 해낼 수 있어요/)).toBeInTheDocument();
    expect(screen.getByText("2시간 전")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("🍀 1번");
  });
});
