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

it("LG-01 정책 본문 화면은 중복 법적 푸터를 렌더하지 않는다", () => {
  pathname = "/privacy";
  const { container } = render(<ConditionalFooter />);
  expect(container).toBeEmptyDOMElement();
});

it("LG-02 /my 1단 목록은 단일정본의 link 모드로 법적 링크를 렌더한다", () => {
  pathname = "/my";
  render(<ConditionalFooter />);
  expect(screen.getByTestId("legal-footer")).toHaveTextContent("이용약관");
  expect(screen.getAllByRole("link")).toHaveLength(3);
});

it("LG-03 /my/legal 전문은 단일정본의 biz 모드로 사업자 정보를 렌더한다", () => {
  pathname = "/my/legal";
  render(<ConditionalFooter />);
  expect(screen.getByTestId("legal-footer")).toContainElement(screen.getByTestId("business-information"));
});
