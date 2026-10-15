// Wordmap.test.tsx — Wordmap 단위 테스트

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmap } from "../Wordmap";

describe("Wordmap", () => {
  it("words=[]이면 empty 상태 렌더", () => {
    render(<Wordmap words={[]} />);
    expect(screen.getByTestId("wordmap-empty")).toBeInTheDocument();
    expect(screen.getByText("아직 응원 메시지가 없어요")).toBeInTheDocument();
  });

  it("empty: ownerName 사용", () => {
    render(<Wordmap words={[]} ownerName="도경" />);
    expect(screen.getByText(/도경/)).toBeInTheDocument();
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

  it("WM-01 고정 좌표·회전 없이 전체 메시지를 흐름 배치한다", () => {
    render(
      <Wordmap
        words={[
          { word: "긴 한글 응원 문장이 겹치지 않고 자연스럽게 줄바꿈됩니다", word_count: 2 },
          { word: "SupercalifragilisticexpialidociousWithoutSpaces", word_count: 1 },
        ]}
      />,
    );

    const wordmap = screen.getByTestId("wordmap");
    expect(wordmap).toHaveClass("wordmap-cloud");
    expect(wordmap.style.height).toBe("");
    expect(
      screen.getByRole("group", {
        name: "응원 메시지 워드맵, 전체 2개 표시",
      }),
    ).toBeInTheDocument();

    wordmap.querySelectorAll<HTMLElement>("[data-wordmap-item]").forEach((word) => {
      expect(word).toHaveClass("wordmap-cloud-item");
      expect(word.style.transform).toBe("");
    });
  });

  it("입력을 NFC·공백 정규화하고 중복 문자열의 빈도를 합친다", () => {
    render(
      <Wordmap
        words={[
          { word: "  화이팅   해낼게  ", word_count: 2 },
          { word: "화이팅 해낼게", word_count: 3 },
          { word: "   ", word_count: 99 },
        ]}
      />,
    );

    expect(screen.getAllByText("화이팅 해낼게")).toHaveLength(1);
    expect(screen.getByText("화이팅 해낼게")).toHaveAttribute("data-wordmap-tier", "s3");
    expect(screen.getByTestId("wordmap")).toHaveAttribute(
      "aria-label",
      "응원 메시지 워드맵, 전체 1개 표시",
    );
  });

  it("WM-02 빈도에 따라 3단계 강조를 적용하고 동률이면 모두 중간 단계다", () => {
    const { rerender } = render(
      <Wordmap
        words={[
          { word: "최상", word_count: 10 },
          { word: "중간", word_count: 6 },
          { word: "기본", word_count: 1 },
        ]}
      />,
    );

    expect(screen.getByText("최상")).toHaveClass("wordmap-tier-s3");
    expect(screen.getByText("중간")).toHaveClass("wordmap-tier-s2");
    expect(screen.getByText("기본")).toHaveClass("wordmap-tier-s1");

    rerender(
      <Wordmap
        words={[
          { word: "동률1", word_count: 2 },
          { word: "동률2", word_count: 2 },
        ]}
      />,
    );
    expect(screen.getByText("동률1")).toHaveClass("wordmap-tier-s2");
    expect(screen.getByText("동률2")).toHaveClass("wordmap-tier-s2");
  });

  it("WM-03 빈도 내림차순·동률 입력순으로 전체 메시지를 표시한다", () => {
    const words = Array.from({ length: 13 }, (_, i) => ({
      word: `단어${i}`,
      word_count: i === 12 ? 100 : 1,
    }));
    render(<Wordmap words={words} />);

    const wm = screen.getByTestId("wordmap");
    const spans = wm.querySelectorAll("[data-wordmap-item]");
    expect(spans).toHaveLength(13);
    expect(screen.getByText("단어12")).toBeInTheDocument();
    expect(wm).toHaveTextContent("단어11");
    expect(screen.queryByTestId("wordmap-overflow-toggle")).not.toBeInTheDocument();
    expect(wm).toHaveAttribute(
      "aria-label",
      "응원 메시지 워드맵, 전체 13개 표시",
    );
  });

  it("CT-WORDMAP-01 공개 목표도 전체 메시지를 노출한다", () => {
    const words = Array.from({ length: 13 }, (_, i) => ({
      word: `공개단어${i}`,
      word_count: i + 1,
    }));
    render(<Wordmap words={words} showOverflowDisclosure={false} />);

    expect(screen.getByTestId("wordmap").querySelectorAll("[data-wordmap-item]")).toHaveLength(13);
    expect(screen.queryByTestId("wordmap-overflow-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wordmap-overflow-list")).not.toBeInTheDocument();
  });

  it("정규화 후 빈 문자열만 남으면 기존 empty 상태를 유지한다", () => {
    render(<Wordmap words={[{ word: "   ", word_count: 1 }]} ownerName="도경" />);
    expect(screen.getByTestId("wordmap-empty")).toBeInTheDocument();
    expect(screen.getByText(/도경/)).toBeInTheDocument();
  });

  it("금액·클로버 수치 노출 없음", () => {
    const words = [{ word: "응원해", word_count: 2 }];
    const { container } = render(<Wordmap words={words} />);
    // ₩ 기호, "N원" 원화 패턴, "클로버 N개" 패턴 없음 확인
    expect(container.textContent).not.toMatch(/₩|[0-9]+원|클로버 [0-9]+개/);
  });
});
