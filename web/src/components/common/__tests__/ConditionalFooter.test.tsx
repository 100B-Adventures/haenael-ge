import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ConditionalFooter } from "../ConditionalFooter";

let pathname = "/friends";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

beforeEach(() => {
  pathname = "/friends";
});

it("CT-FOOTER-01 하단탭 화면에서는 전역 푸터를 렌더하지 않는다", () => {
  const { container } = render(<ConditionalFooter />);
  expect(container).toBeEmptyDOMElement();
});

it("CT-FOOTER-02 하단탭이 없는 정책 화면에서는 전역 푸터를 렌더한다", () => {
  pathname = "/privacy";
  render(<ConditionalFooter />);
  expect(screen.getByTestId("site-footer")).toHaveTextContent("정성컴퍼니");
});
