// Wordmap.test.tsx — Wordmap 단위 테스트

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmap } from "../Wordmap";

describe("Wordmap", () => {
  it("words=[]이면 empty 상태 렌더", () => {
    render(<Wordmap words={[]} />);
    expect(screen.getByTestId("wordmap-empty")).toBeInTheDocument();
    expect(screen.getByText("아직 아무도 없어요")).toBeInTheDocument();
  });

  it("empty: ownerName 사용", () => {
    render(<Wordmap words={[]} ownerName="도경" />);
    expect(screen.getByText(/도경의 첫 응원/)).toBeInTheDocument();
  });

  it("단어 있으면 워드맵 컨테이너 렌더", () => {
    const words = [
      { word: "화이팅", word_count: 5 },
      { word: "멋지다", word_count: 3 },
    ];
    render(<Wordmap words={words} />);
    expect(screen.getByTestId("wordmap")).toBeInTheDocument();
    expect(screen.getByText("화이팅")).toBeInTheDocument();
    expect(screen.getByText("멋지다")).toBeInTheDocument();
  });

  it("12개 초과 단어는 잘라서 표시", () => {
    const words = Array.from({ length: 20 }, (_, i) => ({
      word: `단어${i}`,
      word_count: 1,
    }));
    render(<Wordmap words={words} />);
    // 최대 12개만 표시
    const wm = screen.getByTestId("wordmap");
    const spans = wm.querySelectorAll("span");
    expect(spans.length).toBeLessThanOrEqual(12);
  });

  it("금액·클로버 수치 노출 없음", () => {
    const words = [{ word: "응원해", word_count: 2 }];
    const { container } = render(<Wordmap words={words} />);
    // ₩ 기호, "N원" 원화 패턴, "클로버 N개" 패턴 없음 확인
    expect(container.textContent).not.toMatch(/₩|[0-9]+원|클로버 [0-9]+개/);
  });
});
