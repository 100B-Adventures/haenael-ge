import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage from "../page";

describe("개인정보처리방침", () => {
  it("P1-16 카카오·솔라피 알림 처리를 비활성으로 잘못 고지하지 않는다", () => {
    render(<PrivacyPage />);

    const page = screen.getByTestId("privacy-page");
    expect(page).toHaveTextContent("카카오톡 알림톡 발송");
    expect(page).toHaveTextContent("알림톡 발송 요청 중계에 이용");
    expect(page).toHaveTextContent("발송할 수 없으면 인앱 알림으로 대체");
    expect(
      screen.getByText("(주)카카오").closest("li"),
    ).not.toHaveTextContent("비활성");
    expect(
      screen.getByText("(주)넥스모어시스템즈(솔라피)").closest("li"),
    ).not.toHaveTextContent("비활성");
  });
});
