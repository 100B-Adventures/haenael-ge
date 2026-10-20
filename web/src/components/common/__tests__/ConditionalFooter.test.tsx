import { render } from "@testing-library/react";
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

it("LG-01 정책 본문 화면은 중복 법적 푸터를 렌더하지 않는다", () => {
  pathname = "/privacy";
  const { container } = render(<ConditionalFooter />);
  expect(container).toBeEmptyDOMElement();
});

it("LG-03 사업자 정보 전문 페이지에는 전역 푸터를 중복 렌더하지 않는다", () => {
  pathname = "/my/legal";
  const { container } = render(<ConditionalFooter />);
  expect(container).toBeEmptyDOMElement();
});
