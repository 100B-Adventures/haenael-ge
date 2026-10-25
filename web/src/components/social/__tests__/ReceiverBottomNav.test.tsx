import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

it("GT-03 비회원은 자물쇠 없이 예시 미리보기 시트를 연다", async () => {
  pathname = "/";
  const { container } = render(<ReceiverBottomNav locked />);
  expect(container.querySelectorAll(".receiver-tabbar-lock")).toHaveLength(0);
  expect(screen.getByRole("link", { name: /^홈$/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await userEvent.click(screen.getByRole("button", { name: "친구" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("예시 화면");
  expect(screen.getByRole("dialog")).not.toHaveTextContent("친구 3명");
});

it.each(["/cashout", "/cashout/status", "/cashout/history"])(
  "CT-NAV-04 단일 거래 화면 %s에서는 하단탭을 숨긴다",
  (path) => {
    pathname = path;
    const { container } = render(<ReceiverBottomNav />);
    expect(container).toBeEmptyDOMElement();
  },
);

it("CT-NAV-05 응원 워드맵 전체보기에서도 하단탭을 유지한다", () => {
  pathname = "/wordmap/42";
  render(<ReceiverBottomNav />);
  expect(screen.getByTestId("receiver-bottom-nav")).toBeInTheDocument();
});

it("CT-NAV-06 프로토타입 정본에 따라 목표 관리에서도 하단탭을 유지한다", () => {
  pathname = "/me/goal/42";
  render(<ReceiverBottomNav />);
  expect(screen.getByTestId("receiver-bottom-nav")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^홈$/ })).toHaveAttribute("aria-current", "page");
});
