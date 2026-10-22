import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ChildSafetyPage from "../page";

describe("아동·청소년 보호 정책", () => {
  it("P1-05 적용 범위, 금지행위, 신고·지원 경로와 개정일을 제공한다", () => {
    render(<ChildSafetyPage />);

    const page = screen.getByTestId("child-safety-page");
    expect(page).toHaveTextContent("시행일 2026년 10월 22일");
    expect(page).toHaveTextContent("금지되는 행위");
    expect(page).toHaveTextContent("신고와 대응");
    expect(page).toHaveTextContent("경찰 112");
    expect(page).toHaveTextContent("청소년전화 1388");
    expect(page).toHaveTextContent("1377");
    expect(page).toHaveTextContent("별도 법률 검토가 필요한 사항");
    expect(
      screen.getByRole("link", { name: "haenaelge.official@gmail.com" }),
    ).toHaveAttribute("href", expect.stringContaining("mailto:"));
    expect(page).not.toHaveTextContent("내용 준비 중입니다");
  });
});
