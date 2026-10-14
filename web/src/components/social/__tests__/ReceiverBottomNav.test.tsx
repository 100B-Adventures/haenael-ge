import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ReceiverBottomNav } from "../ReceiverBottomNav";

let pathname = "/friends";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/friends";
});

it("CT-NAV-01 홈 친구 초대 마이 4탭과 친구 활성 상태를 렌더한다", () => {
  render(<ReceiverBottomNav />);
  expect(screen.getAllByRole("link")).toHaveLength(4);
  expect(screen.getByRole("link", { name: /친구/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("CT-NAV-03 마이 탭은 /my로 분리되고 실제 경로에서 활성화된다", () => {
  pathname = "/my";
  render(<ReceiverBottomNav />);
  const myLink = screen.getByRole("link", { name: /마이/ });
  expect(myLink).toHaveAttribute("href", "/my");
  expect(myLink).toHaveAttribute("aria-current", "page");
});

it("CT-NAV-02 비회원 잠금 상태는 홈 외 3탭에 잠금 뱃지를 붙인다", () => {
  pathname = "/";
  const { container } = render(<ReceiverBottomNav locked />);
  expect(container.querySelectorAll(".receiver-tabbar-lock")).toHaveLength(3);
  expect(screen.getByRole("link", { name: /^홈$/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: /친구/ })).toHaveAttribute(
    "href",
    "/onboarding",
  );
  expect(screen.getByRole("link", { name: /초대/ })).toHaveAttribute(
    "href",
    "/onboarding",
  );
  expect(screen.getByRole("link", { name: /마이/ })).toHaveAttribute(
    "href",
    "/onboarding",
  );
});
