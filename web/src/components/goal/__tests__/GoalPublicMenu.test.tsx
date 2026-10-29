import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { GoalPublicMenu } from "../GoalPublicMenu";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: vi.fn() } }),
}));

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

it("CP-04 공개 목표 더보기는 details 없이 링크 복사·신고 메뉴를 연다", async () => {
  render(<GoalPublicMenu goalId={17} />);

  const trigger = screen.getByRole("button", { name: "이 목표 더보기" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("menuitem", { name: "링크 복사" })).toBeVisible();
  expect(screen.getByRole("button", { name: "신고하기" })).toBeVisible();

  fireEvent.click(screen.getByRole("menuitem", { name: "링크 복사" }));
  await waitFor(() =>
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      window.location.href,
    ),
  );
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});
