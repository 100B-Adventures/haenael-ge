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
