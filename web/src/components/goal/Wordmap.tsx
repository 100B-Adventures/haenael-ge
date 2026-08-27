// components/goal/Wordmap.tsx — 응원 메시지 워드맵 (read-model)
// 데이터: get_wordmap RPC → { word, word_count }[]
// DESIGN.md §5-5: gradient 예외(clover 계열 옅은 radial 허용). 단색+사이즈/opacity로 다정함.
// 서버 컴포넌트에서도 사용 가능 (no useState).

export interface WordmapWord {
  word: string;
  word_count: number;
}

export interface WordmapProps {
  words: WordmapWord[];
  /** empty 상태용 이름 (목표 주인공) */
  ownerName?: string;
}

type SizeTier = "s1" | "s2" | "s3";

interface NormalizedWordmapWord extends WordmapWord {
  firstIndex: number;
}

function normalizeWords(words: WordmapWord[]): NormalizedWordmapWord[] {
  const merged = new Map<string, NormalizedWordmapWord>();

  words.forEach((item, index) => {
    const word = item.word.normalize("NFC").trim().replace(/\s+/gu, " ");
    if (!word) return;

    const count = Number.isFinite(item.word_count) ? item.word_count : 0;
    const existing = merged.get(word);
    if (existing) {
      existing.word_count += count;
      return;
    }

    merged.set(word, { word, word_count: count, firstIndex: index });
  });

  return Array.from(merged.values()).sort(
    (a, b) => b.word_count - a.word_count || a.firstIndex - b.firstIndex,
  );
}

function getSizeTier(
  count: number,
  minCount: number,
  maxCount: number,
  wordCount: number,
): SizeTier {
  if (wordCount === 1) return "s3";
  if (maxCount === minCount) return "s2";

  const ratio = (count - minCount) / (maxCount - minCount);
  if (ratio >= 0.67) return "s3";
  if (ratio >= 0.34) return "s2";
  return "s1";
}

const TIER_STYLE: Record<SizeTier, React.CSSProperties> = {
  s1: { color: "#8bb79f", fontWeight: 600, fontSize: 14 },
  s2: { color: "#57a178", fontWeight: 700, fontSize: 18 },
  s3: { color: "#1a8150", fontWeight: 800, fontSize: 24 },
};

// ─── Empty 상태 ───────────────────────────────────────────────────────────────

function EmptyWordmap({ ownerName }: { ownerName?: string }) {
  const name = ownerName ?? "이 목표";
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[18px] py-8 px-5 text-center [border:1.5px_dashed_#c3d6c9]! [background-color:var(--card)]! [min-height:160px]!"
      data-testid="wordmap-empty"
    >
      {/* 클로버 아이콘 */}
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="#4aa877"
        className="mb-3"
        aria-hidden="true"
      >
        <path d="M12 12c-1.2-3.6-6-4.8-7.2-1.2s2.4 6 7.2 1.2zm0 0c1.2-3.6 6-4.8 7.2-1.2s-2.4 6-7.2 1.2zm0 0c-3.6 1.2-4.8 6-1.2 7.2s6-2.4 1.2-7.2zm0 0c3.6 1.2 4.8 6 1.2 7.2s-6-2.4-1.2-7.2z" />
      </svg>
      <p className="text-[16px] font-extrabold mb-1.5 [color:var(--foreground)]!">
        아직 아무도 없어요
      </p>
      <p className="text-[12.5px] leading-relaxed [color:var(--muted-foreground)]!">
        당신이{" "}
        <strong className="[color:var(--accent-foreground)]!">
          {name}의 첫 응원
        </strong>
        이에요.
        <br />한 마디면 이 자리가 채워지기 시작해요.
      </p>
    </div>
  );
}

// ─── 워드맵 본체 ──────────────────────────────────────────────────────────────

export function Wordmap({ words, ownerName }: WordmapProps) {
  const normalizedWords = normalizeWords(words);

  if (normalizedWords.length === 0) {
    return <EmptyWordmap ownerName={ownerName} />;
  }

  const counts = normalizedWords.map((item) => item.word_count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const visibleWords = normalizedWords.slice(0, 12);

  return (
    <div
      className="flex min-h-[200px] w-full flex-wrap content-center justify-center gap-x-3 gap-y-2.5 rounded-[18px] px-4 py-5 [background-image:radial-gradient(90%_90%_at_50%_45%,_var(--accent),_#EEF6F0_72%,_transparent)]!"
      data-testid="wordmap"
      role="group"
      aria-label={`응원 메시지 워드맵, 전체 ${normalizedWords.length}개 중 ${visibleWords.length}개 표시`}
    >
      {visibleWords.map((item) => {
        const tier = getSizeTier(
          item.word_count,
          minCount,
          maxCount,
          normalizedWords.length,
        );

        return (
          <span
            key={item.word}
            className="inline-flex min-w-0 max-w-full select-none whitespace-normal text-center [max-inline-size:100%]! [min-inline-size:0]! [overflow-wrap:anywhere]! [line-height:1.35]!"
            style={{ ...TIER_STYLE[tier] }}
            data-wordmap-tier={tier}
          >
            {item.word}
          </span>
        );
      })}
    </div>
  );
}

import type React from "react";
