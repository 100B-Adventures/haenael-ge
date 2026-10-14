import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FriendGoalDetail } from "../FriendGoalDetail";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/(receiver)/social-actions", () => ({ removeFriendAction: vi.fn() }));

const primary = {
  goal_id: 1,
  slug: "run",
  title: "이번 달에는 세 번씩 달릴게",
  reason: "건강한 리듬을 만들고 싶어요.",
  due_date: "2026-12-01",
  cover_preset_key: "c1",
  cover_public_path: null,
  cheer_count: 13,
  wordmap: [{ word: "꾸준히", weight: 2 }],
};

it("CT-FRIEND-03 친구 상세는 소속감 정보와 다른 목표 동선을 표시한다", () => {
  render(
    <FriendGoalDetail
      friendId="friend-a"
      nickname="서연"
      detail={primary}
      friendGoals={[primary, {
        ...primary,
        goal_id: 2,
        slug: "read",
        title: "매일 스무 쪽 읽을게",
        cheer_count: 7,
      }]}
    />,
  );

  expect(screen.getByText("서연을 응원하는 사람으로서", { exact: false })).toBeInTheDocument();
  expect(screen.getByText("13명이 서연을 조용히 응원하는 중이에요")).toBeInTheDocument();
  expect(screen.queryByText("함께한 자취 타임라인")).not.toBeInTheDocument();
  expect(screen.getByText("꾸준히")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /매일 스무 쪽 읽을게/ }))
    .toHaveAttribute("href", "/friends/friend-a?goal=2");
  expect(screen.getByRole("link", { name: /다른 친구도 이 자리에 부를까요/ }))
    .toHaveAttribute("href", "/invite");
});
