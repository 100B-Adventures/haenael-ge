// CheerCount.test.tsx — CheerCount 단위 테스트

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CheerCount } from "../CheerCount";

describe("CheerCount", () => {
  it("count=0이면 아무것도 렌더하지 않음", () => {
    const { container } = render(<CheerCount count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("count=1: '1명이 조용히 응원했어요' 표시", () => {
    render(<CheerCount count={1} />);
    expect(screen.getByTestId("cheer-count")).toHaveTextContent("1명");
    expect(screen.getByTestId("cheer-count")).toHaveTextContent("조용히 응원했어요");
  });

  it("count=13: '13명' 표시", () => {
    render(<CheerCount count={13} />);
    expect(screen.getByTestId("cheer-count")).toHaveTextContent("13명");
  });

  it("금액 노출 없음 — ₩·원화·클로버 개수 없음", () => {
    const { container } = render(<CheerCount count={100} />);
    // ₩ 기호, "100원" 같은 원화 패턴, "클로버 N개" 패턴이 없어야 함
    // "응원"의 "원"은 false-positive이므로 구체적 패턴 사용
    expect(container.textContent).not.toMatch(/₩|[0-9]+원|클로버 [0-9]+개/);
  });
});
