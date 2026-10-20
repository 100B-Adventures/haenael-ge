import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { BusinessInfoBlock, LegalFooter, LegalLinkList } from "../LegalFooter";
import { BUSINESS_INFORMATION } from "@/lib/legal/exposure";

it("LG-04 법정 기재사항 6항목이 한 데이터 원본에서 전수 렌더된다", () => {
  expect(Object.values(BUSINESS_INFORMATION).every(Boolean)).toBe(true);
  expect(Object.keys(BUSINESS_INFORMATION)).toHaveLength(6);
  render(<BusinessInfoBlock />);
  for (const value of Object.values(BUSINESS_INFORMATION)) {
    expect(screen.getByText(value)).toBeInTheDocument();
  }
});

it("LG-01 none 모드는 DOM을 만들지 않는다", () => {
  const { container } = render(<LegalFooter mode="none" />);
  expect(container).toBeEmptyDOMElement();
});

it("LG-03 1단 목록은 약관 개인정보 사업자 정보 세 항목만 가진다", () => {
  render(<LegalLinkList />);
  expect(screen.getAllByRole("link")).toHaveLength(3);
});
