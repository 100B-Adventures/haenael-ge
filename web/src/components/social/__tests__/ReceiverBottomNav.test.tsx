import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ReceiverBottomNav } from "../ReceiverBottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/friends" }));

it("CT-NAV-01 홈 친구 초대 마이 4탭과 친구 활성 상태를 렌더한다", () => {
  render(<ReceiverBottomNav />);
  expect(screen.getAllByRole("link")).toHaveLength(4);
  expect(screen.getByRole("link", { name: /친구/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("CT-NAV-02 비회원 잠금 상태는 홈 외 3탭에 잠금 뱃지를 붙인다", () => {
  const { container } = render(<ReceiverBottomNav locked />);
  expect(container.querySelectorAll(".receiver-tabbar-lock")).toHaveLength(3);
  expect(screen.getAllByRole("link").every((link) =>
    link.getAttribute("href") === "/"
  )).toBe(true);
});
