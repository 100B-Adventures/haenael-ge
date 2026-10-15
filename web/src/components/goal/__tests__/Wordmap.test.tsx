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

  it("고정 좌표·회전 없이 flex-wrap 흐름과 자동 높이를 사용한다", () => {
    render(
      <Wordmap
        words={[
          { word: "긴 한글 응원 문장이 겹치지 않고 자연스럽게 줄바꿈됩니다", word_count: 2 },
          { word: "SupercalifragilisticexpialidociousWithoutSpaces", word_count: 1 },
        ]}
      />,
    );

    const wordmap = screen.getByTestId("wordmap");
    expect(wordmap).toHaveClass("flex", "flex-wrap", "min-h-[200px]");
    expect(wordmap.style.height).toBe("");
    expect(
      screen.getByRole("group", {
        name: "응원 메시지 워드맵, 전체 2개 중 2개 표시",
      }),
    ).toBeInTheDocument();

    wordmap.querySelectorAll("span").forEach((word) => {
      expect(word).not.toHaveClass("absolute", "whitespace-nowrap");
      expect(word).toHaveClass("min-w-0", "max-w-full", "whitespace-normal");
      expect(word).toHaveClass("[overflow-wrap:anywhere]!");
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
      "응원 메시지 워드맵, 전체 1개 중 1개 표시",
    );
  });

  it("빈도에 따라 14/18/24px 3단계를 적용하고 동률이면 모두 18px이다", () => {
    const { rerender } = render(
      <Wordmap
        words={[
          { word: "최상", word_count: 10 },
          { word: "중간", word_count: 6 },
          { word: "기본", word_count: 1 },
        ]}
      />,
    );

    expect(screen.getByText("최상")).toHaveStyle({ fontSize: "24px" });
    expect(screen.getByText("중간")).toHaveStyle({ fontSize: "18px" });
    expect(screen.getByText("기본")).toHaveStyle({ fontSize: "14px" });

    rerender(
      <Wordmap
        words={[
          { word: "동률1", word_count: 2 },
          { word: "동률2", word_count: 2 },
        ]}
      />,
    );
    expect(screen.getByText("동률1")).toHaveStyle({ fontSize: "18px" });
    expect(screen.getByText("동률2")).toHaveStyle({ fontSize: "18px" });
  });

  it("빈도 내림차순·동률 입력순으로 상위 12개만 표시한다", () => {
    const words = Array.from({ length: 13 }, (_, i) => ({
      word: `단어${i}`,
      word_count: i === 12 ? 100 : 1,
    }));
    render(<Wordmap words={words} />);

    const wm = screen.getByTestId("wordmap");
    const spans = wm.querySelectorAll("span");
    expect(spans).toHaveLength(12);
    expect(screen.getByText("단어12")).toBeInTheDocument();
    // 구름에는 12개까지만 넣는다. 다만 13번째부터를 문서에서 아예 지우면
    // 응원한 사람의 말이 사라진 것처럼 보인다. 구름 밖 펼침 목록으로 남긴다.
    expect(wm.textContent).not.toContain("단어11");
    expect(screen.getByTestId("wordmap-overflow-toggle")).toHaveTextContent(
      "나머지 1개 보기",
    );
    expect(
      screen.getByTestId("wordmap-overflow-list"),
    ).toHaveTextContent("단어11");
    expect(wm).toHaveAttribute(
      "aria-label",
      "응원 메시지 워드맵, 전체 13개 중 12개 표시",
    );
  });

  it("CT-WORDMAP-01 공개 목표는 상위 12개를 유지하되 추가 펼침 카드를 노출하지 않는다", () => {
    const words = Array.from({ length: 13 }, (_, i) => ({
      word: `공개단어${i}`,
      word_count: i + 1,
    }));
    render(<Wordmap words={words} showOverflowDisclosure={false} />);

    expect(screen.getByTestId("wordmap").querySelectorAll("span")).toHaveLength(12);
    expect(screen.queryByTestId("wordmap-overflow-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wordmap-overflow-list")).not.toBeInTheDocument();
  });

  it("정규화 후 빈 문자열만 남으면 기존 empty 상태를 유지한다", () => {
    render(<Wordmap words={[{ word: "   ", word_count: 1 }]} ownerName="도경" />);
    expect(screen.getByTestId("wordmap-empty")).toBeInTheDocument();
    expect(screen.getByText(/도경의 첫 응원/)).toBeInTheDocument();
  });

  it("금액·클로버 수치 노출 없음", () => {
    const words = [{ word: "응원해", word_count: 2 }];
    const { container } = render(<Wordmap words={words} />);
    // ₩ 기호, "N원" 원화 패턴, "클로버 N개" 패턴 없음 확인
    expect(container.textContent).not.toMatch(/₩|[0-9]+원|클로버 [0-9]+개/);
  });
});
