import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage from "../page";

describe("/terms 운영 정합", () => {
  it("TC-TERMS-01 활성 환전의 자격, 신청량, 수동 지급을 현재 사실로 안내한다", () => {
    render(<TermsPage />);

    const page = screen.getByTestId("terms-page");
    expect(page).toHaveTextContent("환전하는 기능은 현재 운영 중입니다");
    expect(page).toHaveTextContent("모인 클로버가 30개 이상이면 환전 자격을 충족");
    expect(page).toHaveTextContent("지급 가능한 클로버 안에서 1개 이상");
    expect(page).toHaveTextContent("계좌정보를 확인하고 계좌이체를 수동으로 처리");
  });

  it("TC-TERMS-02 KYC 없음 신청 허용과 확인 미성년 차단을 분리한다", () => {
    render(<TermsPage />);

    const page = screen.getByTestId("terms-page");
    expect(page).toHaveTextContent("본인인증 기록이 없는 회원도 신청할 수 있습니다");
    expect(page).toHaveTextContent("미성년으로 확인된 회원은 신청할 수 없습니다");
    expect(page.textContent).not.toMatch(
      /현재 버전에서 명시적으로 비활성화|본인인증\(KYC\) 절차를 완료해야|예금주 조회\(계좌실명확인\) API/,
    );
  });

  it("TC-TERMS-03 세무 계산과 미확정 법률 판단의 경계를 밝힌다", () => {
    render(<TermsPage />);

    const page = screen.getByTestId("terms-page");
    expect(page).toHaveTextContent("3.3%를 원천징수 예정액으로 계산");
    expect(page).toHaveTextContent("확정된 세무 판단이 아닙니다");
    expect(page).toHaveTextContent("관계 법령과 전문가 검토 결과에 따라 달라질 수");
  });
});
