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

it("CT-FRIEND-01 친구 목록은 대표 목표 한 행만 보여 주고 상세에서 다른 목표 동선을 보존한다", () => {
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

  expect(screen.getByText((_, element) => Boolean(element?.classList.contains("friends-count") && element.textContent === "친구 1명"))).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /이번 달에는 세 번씩 달릴게/ }))
    .toHaveAttribute("href", "/friends/friend-a?goal=1");
  expect(screen.queryByRole("link", { name: "매일 스무 쪽 읽을게" }))
    .not.toBeInTheDocument();
  expect(screen.queryByText("연결된 친구")).not.toBeInTheDocument();
  expect(screen.queryByText("서로 응원")).not.toBeInTheDocument();
  expect(document.body).not.toHaveTextContent("번 함께");
  expect(screen.getByTestId("friends-sparse-next-step")).toHaveTextContent(
    "한 명 더 함께 응원해볼까요?",
  );
  expect(screen.getByRole("link", { name: "친구 초대하기" })).toHaveAttribute(
    "href",
    "/invite",
  );
});

it("CT-FRIEND-04 긴 닉네임·이미지 없음·다수 친구를 모두 안전하게 렌더한다", () => {
  const friends = Array.from({ length: 12 }, (_, index) => ({
    friend_member_id: `friend-${index}`,
    nickname: index === 0 ? "아주아주아주아주아주긴친구닉네임" : null,
    profile_image: null,
    goals,
  }));
  render(<FriendGoalList friends={friends} />);
  expect(screen.getByText((_, element) => Boolean(element?.classList.contains("friends-count") && element.textContent === "친구 12명"))).toBeInTheDocument();
  expect(screen.getByText("아주아주아주아주아주긴친구닉네임")).toHaveAttribute(
    "title",
    "아주아주아주아주아주긴친구닉네임",
  );
  expect(screen.getAllByRole("link")).toHaveLength(12);
  expect(screen.queryByTestId("friends-sparse-next-step")).not.toBeInTheDocument();
});

it("CT-FRIEND-02 친구 0명은 실제 초대 절차와 CTA를 표시한다", () => {
  render(<FriendGoalList friends={[]} />);
  expect(screen.getByText("아직 친구가 없어요")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("link", { name: "친구 초대하기" }))
    .toHaveAttribute("href", "/invite");
});
