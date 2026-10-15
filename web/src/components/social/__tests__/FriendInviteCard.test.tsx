import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { FriendInviteCard } from "../FriendInviteCard";

const createInvite = vi.fn();

vi.mock("@/app/(receiver)/social-actions", () => ({
  createFriendInviteAction: (goalId: number) => createInvite(goalId),
}));

beforeEach(() => {
  createInvite.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

it("CT-INVITE-01 승인 시안의 초대 링크 복사 버튼이 링크를 만들고 복사한다", async () => {
  createInvite.mockResolvedValue({
    ok: true,
    data: {
      web_path: "/invite/sample-token",
      app_link: "haenaelge://invite/sample-token",
      expires_at: "2026-10-20T00:00:00Z",
    },
  });
  render(
    <FriendInviteCard
      goals={[{ id: 42, title: "매일 달리기", visibility: "FRIENDS" }]}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "초대 링크 복사" }));
  expect(createInvite).toHaveBeenCalledWith(42);
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    `${window.location.origin}/invite/sample-token`,
  );
  expect(screen.getByRole("status")).toHaveTextContent("초대 링크를 복사했어요.");
});

it("CT-INVITE-02 초대 생성 거절 코드는 사용자 복구 문구로 표시한다", async () => {
  createInvite.mockResolvedValue({ ok: false, code: "invite_rate_limited" });
  render(
    <FriendInviteCard
      goals={[{ id: 42, title: "매일 달리기", visibility: "PUBLIC" }]}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "초대 링크 복사" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "잠시 뒤에 새 초대 링크를 만들어 주세요.",
  );
});

it("CT-INVITE-03 초대 가능한 목표가 없으면 관리 화면으로 이어진다", () => {
  render(<FriendInviteCard goals={[]} />);

  expect(screen.getByRole("heading", { name: "초대할 목표가 없어요" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "내 해낼게 관리하기" }))
    .toHaveAttribute("href", "/me");
  expect(screen.queryByRole("button", { name: "초대 링크 복사" })).not.toBeInTheDocument();
});
