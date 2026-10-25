// Wordmap.test.tsx — Wordmap 단위 테스트

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Wordmap } from "../Wordmap";
import { cloudMotionEnvelope } from "../WordmapCloudLayout";
import { extractWordmapKeywords } from "@/lib/wordmap/keywords";

describe("Wordmap", () => {
  it("WM-LAYOUT-03 긴 단어는 부유 이동과 회전 전체 범위를 충돌 여백에 포함한다", () => {
    const envelope = cloudMotionEnvelope(164, 24);

    expect(envelope.x).toBeGreaterThan(3.5);
    expect(envelope.y).toBeGreaterThan(5);
    expect(envelope.y * 2).toBeGreaterThan(8.5);
  });

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

  it("WM-GOAL-01 실제 목표 제목을 워드맵 안에 표시하고 D-030-F suffix를 적용한다", () => {
    render(<Wordmap words={[{ word: "화이팅", word_count: 2 }]} goalTitle="토익 900" />);
    expect(screen.getByTestId("wordmap-goal-title")).toHaveTextContent("🍀 토익 900 해낼게");
  });

  it("WM-GOAL-02 게로 끝난 실제 제목은 해낼게 suffix를 중복하지 않는다", () => {
    render(<Wordmap words={[{ word: "화이팅", word_count: 2 }]} goalTitle="2급 자격증 따낼게" />);
    expect(screen.getByTestId("wordmap-goal-title")).toHaveTextContent("🍀 2급 자격증 따낼게");
    expect(screen.getByTestId("wordmap-goal-title")).not.toHaveTextContent("따낼게 해낼게");
  });

  it("WM-01 고정 좌표·회전 없이 추출한 전체 키워드를 흐름 배치한다", () => {
    render(
      <Wordmap
        words={[
          { word: "마라톤 완주까지 끝까지 응원할게요", word_count: 2 },
          { word: "SupercalifragilisticexpialidociousWithoutSpaces", word_count: 1 },
        ]}
      />,
    );

    const wordmap = screen.getByTestId("wordmap");
    expect(wordmap).toHaveClass("wordmap-cloud");
    expect(wordmap.style.height).toBe("");
    expect(
      screen.getByRole("group", {
        name: "응원 메시지 워드맵, 전체 4개 표시",
      }),
    ).toBeInTheDocument();

    wordmap.querySelectorAll<HTMLElement>("[data-wordmap-item]").forEach((word) => {
      expect(word).toHaveClass("wordmap-cloud-item");
      expect(word.style.transform).toBe("");
    });
  });

  it("입력을 NFC·공백 정규화하고 같은 의미 키워드의 빈도를 합친다", () => {
    render(
      <Wordmap
        words={[
          { word: "  화이팅! 끝까지 응원할게요  ", word_count: 2 },
          { word: "파이팅, 응원합니다", word_count: 3 },
          { word: "   ", word_count: 99 },
        ]}
      />,
    );

    expect(screen.getAllByText("화이팅")).toHaveLength(1);
    expect(screen.getByText("화이팅")).toHaveAttribute("data-wordmap-tier", "s3");
    expect(screen.getByText("응원")).toHaveAttribute("data-wordmap-tier", "s3");
    expect(screen.getByTestId("wordmap")).toHaveAttribute(
      "aria-label",
      "응원 메시지 워드맵, 전체 3개 표시",
    );
  });

  it("WM-KO-01 조사·어미·서술어 토막은 버리고 명사·형용 의미·감탄 표현을 남긴다", () => {
    const keywords = extractWordmapKeywords(
      "저희가 마라톤을 끝까지 응원할게요. 정말 꾸준해요. 건넬게요. 다음은 서연님의 차례예요. 클로버는 마음이에요 ❤️",
    );

    expect(keywords).toEqual(expect.arrayContaining(["마라톤", "끝까지", "응원", "꾸준함", "❤️"]));
    ["저희가", "저희", "건넬게요", "건네", "차례예요", "차례", "클로버는", "클로버"]
      .forEach((fragment) => expect(keywords).not.toContain(fragment));
  });

  it("WM-KO-02 최소 길이와 숫자 규칙으로 한 글자·금액성 토막을 제외한다", () => {
    expect(extractWordmapKeywords("나 너 100개 꿈을 향해 힘내! 최고야")).toEqual(
      expect.arrayContaining(["꿈", "힘내", "최고"]),
    );
    expect(extractWordmapKeywords("나 너 100개 꿈을 향해 힘내! 최고야"))
      .not.toEqual(expect.arrayContaining(["나", "너", "100개"]));
  });

  it("WM-KO-03 시스템 환영 문장의 기능어는 제거하고 의미 표현만 남긴다", () => {
    const keywords = extractWordmapKeywords(
      "저희가 먼저 응원을 건넬게요. 친구들은 오늘도 한걸음 함께 가요.",
    );

    expect(keywords).toEqual(expect.arrayContaining(["응원", "한 걸음", "함께"]));
    ["저희", "먼저", "건넬게요", "친구들", "오늘"]
      .forEach((fragment) => expect(keywords).not.toContain(fragment));
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
          { word: "동률하나", word_count: 2 },
          { word: "동률둘", word_count: 2 },
        ]}
      />,
    );
    expect(screen.getByText("동률하나")).toHaveClass("wordmap-tier-s2");
    expect(screen.getByText("동률둘")).toHaveClass("wordmap-tier-s2");
  });

  it("WM-LAYOUT-02 같은 목표의 단어·빈도가 바뀌면 좌표를 다시 계산한다", async () => {
    const originalClientWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientWidth",
    );
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetWidth",
    );
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight",
    );
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: {
        configurable: true,
        get() {
          return this.hasAttribute("data-wordmap-layout") ? 320 : 0;
        },
      },
      offsetWidth: {
        configurable: true,
        get() {
          return Math.max((this.textContent?.length ?? 1) * 10, 20);
        },
      },
      offsetHeight: { configurable: true, get: () => 24 },
    });

    try {
      const { rerender } = render(
        <Wordmap
          goalTitle="토익 900"
          words={[{ word: "화이팅", word_count: 2 }]}
        />,
      );
      await waitFor(() => expect(screen.getByTestId("wordmap"))
        .toHaveAttribute("data-layout-ready", "true"));

      rerender(
        <Wordmap
          goalTitle="토익 900"
          words={[
            { word: "화이팅", word_count: 8 },
            { word: "끝까지", word_count: 3 },
          ]}
        />,
      );
      await waitFor(() => {
        expect(screen.getByTestId("wordmap"))
          .toHaveAttribute("data-layout-ready", "true");
        expect(screen.getByText("끝까지").style.left).not.toBe("");
        expect(screen.getByText("끝까지").style.top).not.toBe("");
      });
    } finally {
      for (const [key, descriptor] of [
        ["clientWidth", originalClientWidth],
        ["offsetWidth", originalOffsetWidth],
        ["offsetHeight", originalOffsetHeight],
      ] as const) {
        if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor);
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
      }
    }
  });

  it("WM-03 빈도 내림차순·동률 입력순으로 전체 메시지를 표시한다", () => {
    const labels = ["햇살", "용기", "열정", "성장", "집중", "완주", "합격", "달성", "도전", "행복", "기쁨", "성공", "응원꽃"];
    const words = labels.map((word, index) => ({ word, word_count: index === 12 ? 100 : 1 }));
    render(<Wordmap words={words} />);

    const wm = screen.getByTestId("wordmap");
    const spans = wm.querySelectorAll("[data-wordmap-item]");
    expect(spans).toHaveLength(13);
    expect(screen.getByText("응원")).toBeInTheDocument();
    expect(wm).toHaveTextContent("성공");
    expect(screen.queryByTestId("wordmap-overflow-toggle")).not.toBeInTheDocument();
    expect(wm).toHaveAttribute(
      "aria-label",
      "응원 메시지 워드맵, 전체 13개 표시",
    );
  });

  it("CT-WORDMAP-01 공개 목표도 전체 메시지를 노출한다", () => {
    const labels = ["햇살", "용기", "열정", "성장", "집중", "완주", "합격", "달성", "도전", "행복", "기쁨", "성공", "응원꽃"];
    const words = labels.map((word, index) => ({ word, word_count: index + 1 }));
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
