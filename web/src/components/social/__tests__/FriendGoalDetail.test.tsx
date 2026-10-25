import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FriendGoalDetail } from "../FriendGoalDetail";
import type { FriendGoalDetail as FriendGoalDetailData } from "@/lib/social/contracts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/(receiver)/social-actions", () => ({ removeFriendAction: vi.fn() }));

const primary: FriendGoalDetailData = {
  goal_id: 1,
  slug: "run",
  title: "이번 달에는 세 번씩 달릴게",
  reason: "건강한 리듬을 만들고 싶어요.",
  due_date: "2026-12-01",
  cover_preset_key: "c1",
  cover_public_path: null,
  cheer_count: 13,
  supporter_avatars: [],
  wordmap: [{ word: "꾸준히", weight: 2 }],
};

it("CT-FRIEND-03 친구 상세는 소속감 정보와 read-only 전체 워드맵 화면 동선을 표시한다", () => {
  render(
    <FriendGoalDetail
      friendId="friend-a"
      nickname="서연"
      relationshipDirection="MUTUAL"
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

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("서연의 해낼게");
  expect(screen.getByText(primary.title)).toBeInTheDocument();
  expect(screen.getByText("서로 응원")).toBeInTheDocument();
  expect(screen.getByText("13명이 서연을 응원하고 있어요")).toBeInTheDocument();
  expect(screen.queryByText("응원자에게만 보이는 근황")).not.toBeInTheDocument();
  expect(screen.queryByText("함께한 자취 타임라인")).not.toBeInTheDocument();
  expect(screen.getByText("꾸준함")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "전체 보기 ›" }))
    .toHaveAttribute("href", "/friends/friend-a/wordmap?goal=1");
  expect(screen.getByRole("link", { name: /매일 스무 쪽 읽을게/ }))
    .toHaveAttribute("href", "/friends/friend-a?goal=2");
  const wordmap = screen.getByTestId("wordmap");
  const reinvite = screen.getByRole("link", { name: /다른 친구도 초대할까요/ });
  expect(wordmap.compareDocumentPosition(reinvite) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(reinvite)
    .toHaveAttribute("href", "/invite");
});

describe("친구 상세 응원자 익명 집계", () => {
  it.each([
    { count: 0, icons: 0, overflow: null },
    { count: 1, icons: 1, overflow: null },
    { count: 2, icons: 2, overflow: null },
    { count: 4, icons: 3, overflow: "+1" },
  ])("CT-FRIEND-05 응원 $count명은 중립 아이콘 $icons개만 표시한다", ({ count, icons, overflow }) => {
    render(
      <FriendGoalDetail
        friendId="friend-a"
        nickname="서연"
        relationshipDirection="MUTUAL"
        detail={{ ...primary, cheer_count: count }}
        friendGoals={[{ ...primary, cheer_count: count }]}
      />,
    );

    expect(screen.queryAllByTestId("neutral-supporter")).toHaveLength(icons);
    if (overflow) expect(screen.getByTestId("supporter-overflow")).toHaveTextContent(overflow);
    else expect(screen.queryByTestId("supporter-overflow")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "" })).not.toBeInTheDocument();
  });

  it("CT-FRIEND-06 공개 프로필 사진만 실제 응원자 avatar로 표시하고 익명은 중립 처리한다", () => {
    render(
      <FriendGoalDetail
        friendId="friend-a"
        nickname="서연"
        relationshipDirection="MUTUAL"
        detail={{
          ...primary,
          cheer_count: 2,
          supporter_avatars: [
            { profile_image: "/images/social-viral/dogyeong.png", is_anonymous: false },
            { profile_image: null, is_anonymous: true },
          ],
        }}
        friendGoals={[primary]}
      />,
    );
    expect(screen.getAllByTestId("supporter-avatar")).toHaveLength(1);
    expect(screen.getAllByTestId("neutral-supporter")).toHaveLength(1);
  });
});
