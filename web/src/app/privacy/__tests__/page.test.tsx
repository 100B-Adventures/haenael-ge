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

  it("GA4·Clarity·Meta의 동의, 국외 이전, 보유기간과 철회 경로를 고지한다", () => {
    render(<PrivacyPage />);
    const page = screen.getByTestId("privacy-page");

    expect(page).toHaveTextContent("transaction_id: 주문번호");
    expect(page).toHaveTextContent("clarityMS@microsoft.com");
    expect(page).toHaveTextContent("최대 14개월");
    expect(page).toHaveTextContent("재생 데이터 30일");
    expect(page).toHaveTextContent("Event Data 최대 2년");
    expect(page).toHaveTextContent("국외 이전 별도 동의");
    expect(page).toHaveTextContent("동의 철회");
    expect(screen.getByTestId("analytics-consent-controls")).toBeInTheDocument();
  });
});
