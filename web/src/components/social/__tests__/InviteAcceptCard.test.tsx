import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { InviteAcceptCard } from "../InviteAcceptCard";

const accept = vi.fn(async (_token: string) => ({
  ok: false as const,
  code: "self_invite",
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock(
  "@/app/(receiver)/social-actions",
  () => ({ acceptFriendInviteAction: (token: string) => accept(token) }),
);

const preview = {
  inviter_nickname: "서연",
  goal_title: "달리기",
  cover_preset_key: "c1",
};

it("CT-07 self_invite stable code를 정확한 복구 카드로 표시한다", async () => {
  render(<InviteAcceptCard token="token" preview={preview} isAuthenticated />);
  await userEvent.click(
    screen.getByRole("button", { name: "초대 수락하고 함께하기" }),
  );
  expect(
    await screen.findByText("내가 만든 초대 링크는 직접 수락할 수 없어요."),
  ).toBeInTheDocument();
});
