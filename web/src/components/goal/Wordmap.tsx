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

// ─── 결정론적 위치 계산 (hydration mismatch 방지) ────────────────────────────
// 단어 인덱스 기반 사전 정의 위치셋. 유기적 배치.
const POSITIONS: Array<{ left: string; top: string; rotate?: string }> = [
  { left: "30%", top: "14%", rotate: "0deg" },
  { left: "8%",  top: "34%", rotate: "-5deg" },
  { left: "50%", top: "40%", rotate: "0deg" },
  { left: "14%", top: "58%", rotate: "3deg" },
  { left: "60%", top: "64%", rotate: "4deg" },
  { left: "40%", top: "76%", rotate: "0deg" },
  { left: "6%",  top: "80%", rotate: "-3deg" },
  { left: "72%", top: "22%", rotate: "-2deg" },
  { left: "55%", top: "18%", rotate: "2deg" },
  { left: "20%", top: "20%", rotate: "-4deg" },
  { left: "68%", top: "50%", rotate: "3deg" },
  { left: "35%", top: "55%", rotate: "-2deg" },
];

// 사이즈 티어: word_count에 따라 s1/s2/s3
function getSizeTier(count: number, maxCount: number): "s1" | "s2" | "s3" {
  const ratio = maxCount > 0 ? count / maxCount : 0;
  if (ratio >= 0.6) return "s3";
  if (ratio >= 0.3) return "s2";
  return "s1";
}

const TIER_STYLE: Record<"s1" | "s2" | "s3", React.CSSProperties> = {
  s1: { color: "#8bb79f", fontWeight: 600, fontSize: 14 },
  s2: { color: "#57a178", fontWeight: 700, fontSize: 18 },
  s3: { color: "#1a8150", fontWeight: 800, fontSize: 28 },
};

// 응원 수에 따라 폰트 크기 스케일 보정 (최대 단어 35px)
function getFontSize(count: number, maxCount: number, tier: "s1" | "s2" | "s3"): number {
  const ratio = maxCount > 0 ? count / maxCount : 0;
  const base = TIER_STYLE[tier].fontSize as number;
  return Math.round(base * (0.7 + ratio * 0.3));
}

// ─── Empty 상태 ───────────────────────────────────────────────────────────────

function EmptyWordmap({ ownerName }: { ownerName?: string }) {
  const name = ownerName ?? "이 목표";
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[18px] py-8 px-5 text-center"
      style={{
        border: "1.5px dashed #c3d6c9",
        background: "#fff",
        minHeight: 160,
      }}
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
      <p className="text-[16px] font-extrabold mb-1.5" style={{ color: "#16140F" }}>
        아직 아무도 없어요
      </p>
      <p className="text-[12.5px] leading-relaxed" style={{ color: "#6F6A60" }}>
        당신이 <strong style={{ color: "#14613A" }}>{name}의 첫 응원</strong>이에요.
        <br />
        한 마디면 이 자리가 채워지기 시작해요.
      </p>
    </div>
  );
}

// ─── 워드맵 본체 ──────────────────────────────────────────────────────────────

export function Wordmap({ words, ownerName }: WordmapProps) {
  if (words.length === 0) {
    return <EmptyWordmap ownerName={ownerName} />;
  }

  const maxCount = Math.max(...words.map((w) => w.word_count));
  // 최대 12개 단어만 (공간 제한)
  const visibleWords = words.slice(0, 12);

  return (
    <div
      className="relative rounded-[18px] overflow-hidden"
      style={{
        height: 200,
        // DESIGN.md §5-5 예외: clover 계열 옅은 radial (장식적 남발 아님)
        background:
          "radial-gradient(90% 90% at 50% 45%, #E7F4EC, #EEF6F0 72%, transparent)",
      }}
      data-testid="wordmap"
      aria-label={`응원 메시지 워드맵 (${words.length}개)`}
    >
      {visibleWords.map((item, i) => {
        const pos = POSITIONS[i % POSITIONS.length];
        const tier = getSizeTier(item.word_count, maxCount);
        const fontSize = getFontSize(item.word_count, maxCount, tier);

        return (
          <span
            key={`${item.word}-${i}`}
            className="absolute whitespace-nowrap select-none"
            style={{
              left: pos.left,
              top: pos.top,
              transform: pos.rotate ? `rotate(${pos.rotate})` : undefined,
              fontSize,
              ...TIER_STYLE[tier],
            }}
          >
            {item.word}
          </span>
        );
      })}
    </div>
  );
}

import type React from "react";
