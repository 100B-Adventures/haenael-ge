import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { InviteAcceptCard } from "../InviteAcceptCard";
import { asInvitePreview, type InvitePreview } from "@/lib/social/contracts";

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

const preview: InvitePreview = {
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

it("invite geometry는 승인 시안의 header 시작점과 50px 로그인 CTA를 유지한다", () => {
  const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  expect(css).toMatch(/\.invite-token-page \.receiver-page-frame\s*\{[\s\S]*?padding-top:\s*0\.875rem/);
  expect(css).toMatch(/\.invite-accept-card \.social-primary-action\s*\{[\s\S]*?padding:\s*var\(--sp-4\)/);
  expect(css).toMatch(/\.invite-preview\s*\{[\s\S]*?padding:\s*var\(--sp-3\) var\(--sp-4\)/);
});

it("CT-06 구 RPC 6필드 응답도 3필드로 축소한 뒤 초대 화면을 렌더한다", () => {
  const legacy = {
    ...preview,
    expires_at: "2026-10-21T00:00:00Z",
    visibility: "PUBLIC",
    invite_id: "legacy-id",
  };
  const picked = asInvitePreview(legacy);
  expect(picked).not.toBeNull();
  if (!picked) throw new Error("legacy preview conversion failed");
  render(<InviteAcceptCard token="token" preview={picked} isAuthenticated={false} />);
  expect(screen.getByTestId("invite-accept-card")).toBeInTheDocument();
  expect(screen.getByTestId("invite-accept-cover")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText(/서연님이 함께 해내자고/)).toBeInTheDocument();
});
