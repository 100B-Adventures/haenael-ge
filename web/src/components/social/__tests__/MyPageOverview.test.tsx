import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MyPageOverview } from "../MyPageOverview";

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
  belonging_queue: [{
    friend_member_id: "friend-a",
    nickname: "도경",
    goal_id: 2,
    slug: "study",
    title: "시험 두 과목 A 받기",
    due_date: "2026-12-20",
    cover_preset_key: "c3",
  }],
};

describe("MyPageOverview", () => {
  it("MY-UI-01 프로필, 내 목표, 친구 수, 검증 가능한 업적 3종을 렌더한다", () => {
    render(<MyPageOverview dashboard={dashboard} />);
    expect(screen.getByTestId("my-profile-summary")).toHaveTextContent("서연");
    expect(screen.getByTestId("my-profile-summary")).toHaveTextContent("친구 3명");
    expect(screen.getByTestId("my-goal-summary-list")).toHaveTextContent("매주 세 번 달리기");
    expect(screen.getByTestId("achievement-completed_goal_count")).toHaveTextContent("2");
    expect(screen.getByTestId("achievement-received_cheer_count")).toHaveTextContent("7");
    expect(screen.getByTestId("achievement-connected_friend_count")).toHaveTextContent("3");
  });

  it("MY-UI-02 소속감 큐는 친구 상세 경로로 연결하고 금액, 순위, 연속 기록을 노출하지 않는다", () => {
    render(<MyPageOverview dashboard={dashboard} />);
    expect(screen.getByTestId("belonging-queue-item")).toHaveAttribute(
      "href",
      "/friends/friend-a?goal=2",
    );
    const text = screen.getByTestId("my-page-overview").textContent ?? "";
    expect(text).not.toMatch(/\d[\d,]*원|₩|순위|연속/);
  });
});
