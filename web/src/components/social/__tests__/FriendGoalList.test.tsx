import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FriendGoalList } from "../FriendGoalList";

const goals = [
  {
    goal_id: 1,
    slug: "run",
    title: "이번 달에는 세 번씩 달릴게",
    due_date: "2026-12-01",
    cover_preset_key: "c1",
    cover_public_path: null,
    cheer_count: 13,
  },
  {
    goal_id: 2,
    slug: "read",
    title: "매일 스무 쪽 읽을게",
    due_date: "2026-11-20",
    cover_preset_key: "c3",
    cover_public_path: null,
    cheer_count: 7,
  },
];

it("CT-FRIEND-01 친구와 모든 공개 목표의 상세 동선을 보존한다", () => {
  render(
    <FriendGoalList
      friends={[{
        friend_member_id: "friend-a",
        nickname: "서연",
        profile_image: null,
        goals,
      }]}
    />,
  );

  expect(screen.getByText("서로 응원하는 친구")).toHaveTextContent("1명");
  expect(screen.getByRole("link", { name: /이번 달에는 세 번씩 달릴게/ }))
    .toHaveAttribute("href", "/friends/friend-a?goal=1");
  expect(screen.getByRole("link", { name: "매일 스무 쪽 읽을게" }))
    .toHaveAttribute("href", "/friends/friend-a?goal=2");
});

it("CT-FRIEND-02 친구 0명은 실제 초대 절차와 CTA를 표시한다", () => {
  render(<FriendGoalList friends={[]} />);
  expect(screen.getByText("아직 친구가 없어요")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("link", { name: "친구 초대하기" }))
    .toHaveAttribute("href", "/invite");
});
