import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FriendInviteCard } from "../FriendInviteCard";
import { GoalCoverPicker } from "../GoalCoverPicker";
import { InviteAcceptCard } from "../InviteAcceptCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/app/(receiver)/social-actions", () => ({
  createFriendInviteAction: vi.fn(),
  setGoalCoverPresetAction: vi.fn(),
  acceptFriendInviteAction: vi.fn(),
}));

it("CT-COPY-01 초대 생성 화면은 만료일과 공개범위 코드와 링크 원문을 노출하지 않는다", () => {
  render(
    <FriendInviteCard
      goals={[{ id: 1, title: "토익 900 해낼게", visibility: "PUBLIC" }]}
    />,
  );

  expect(screen.getByRole("option")).toHaveTextContent("공개");
  expect(screen.getByRole("button", { name: "초대 링크 만들기" }))
    .toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/7일|PUBLIC|FRIENDS|expires_at/);
});

it("CT-COPY-02 초대 만료 오류는 정책 숫자를 노출하지 않는다", () => {
  render(
    <InviteAcceptCard
      token="test-token"
      preview={null}
      isAuthenticated={false}
      initialError="invite_expired"
    />,
  );

  expect(screen.getByText("이 초대는 더 이상 사용할 수 없어요."))
    .toBeInTheDocument();
  expect(document.body.textContent).not.toContain("7일");
});

it("CT-COPY-03 기본 커버는 내부 프리셋 키 대신 사용자 라벨을 쓴다", () => {
  render(
    <GoalCoverPicker
      goalId={1}
      title="토익 900 해낼게"
      initialPreset="c1"
    />,
  );

  expect(screen.getByText("기본 1")).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/\bC[1-6]\b/);
});
