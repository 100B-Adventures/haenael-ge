import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import BusinessInformationPage from "../page";
import { BUSINESS_INFORMATION } from "@/lib/legal/exposure";

it("LG-04 사업자 정보 본문은 법정 기재 6항목과 미확정 신고번호 상태를 표시한다", () => {
  render(<BusinessInformationPage />);

  const information = screen.getByTestId("business-information");
  expect(within(information).getAllByRole("term")).toHaveLength(6);
  expect(within(information).getAllByRole("definition")).toHaveLength(6);
  Object.values(BUSINESS_INFORMATION).forEach((value) => {
    expect(information).toHaveTextContent(value);
  });
  expect(screen.getByText("통신판매업 신고번호 · 확인 중")).toBeInTheDocument();
  expect(screen.getByText(/확인 전 값은 표시하지 않아요/)).toBeInTheDocument();
});
