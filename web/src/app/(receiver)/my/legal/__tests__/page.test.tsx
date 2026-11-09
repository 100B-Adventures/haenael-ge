import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import BusinessInformationPage from "../page";
import { BUSINESS_INFORMATION } from "@/lib/legal/exposure";

it("LG-04 사업자 정보 본문은 법정 기재 6항목과 미확정 신고번호 상태를 표시한다", () => {
  render(<BusinessInformationPage />);

  // DESIGN.md 「법적 고지 노출」(D-030-B·D-040): 이용약관·개인정보처리방침·사업자 정보 3행 목록은 해낼게 관리(/my)가 소유하고,
  // 이 화면은 사업자 정보 전문만 소유한다. 목록이 여기 다시 생기면 같은 링크가 두 단계에 겹친다.
  expect(screen.queryByRole("navigation", { name: "법적 고지" })).not.toBeInTheDocument();
  const information = screen.getByTestId("business-information");
  expect(within(information).getAllByRole("term")).toHaveLength(6);
  expect(within(information).getAllByRole("definition")).toHaveLength(6);
  Object.values(BUSINESS_INFORMATION).forEach((value) => {
    expect(information).toHaveTextContent(value);
  });
  expect(screen.getByText("통신판매업 신고번호 · 확인 중")).toBeInTheDocument();
  expect(screen.getByText(/확인 전 값은 표시하지 않아요/)).toBeInTheDocument();
});
