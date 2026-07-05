// page.tsx — ① 랜딩 (받는사람 존 입구)
// DESIGN.md landing-final.html 진실원. C 미니멀 + 워드맵 프리뷰 하이브리드.
// 슬라이스 #4 실구현.
//
// 심리 법칙 (landing-final.html 벤치마킹 캡션 근거):
//   - 궁금증 갭: "응원은 돈으로 하는 겁니다." + "그게 무슨 말이냐면 ↓"
//   - Zeigarnik: 반쯤 찬 워드맵 = 미완성 긴장 → "내 것도 채우고 싶다"
//   - 사회적 증거 프리뷰: 먼저 쌓인 응원의 결과를 먼저 보여줌

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "해낼게 — 응원은 돈으로 하는 겁니다",
  description:
    "친구가 선언한 목표에 조용히 클로버로 응원하세요. 응원이 쌓이면 예쁜 워드맵이 됩니다.",
  openGraph: {
    title: "해낼게",
    description: "응원은 돈으로 하는 겁니다.",
  },
};

// 워드맵 프리뷰 — 결정론적 샘플 단어
interface PreviewWord {
  word: string;
  s: "s1" | "s2" | "s3";
  left: string;
  top: string;
  size: number;
  rotate?: string;
}
const PREVIEW_WORDS: PreviewWord[] = [
  { word: "멋지다", s: "s3", left: "30%", top: "14%", size: 27 },
  { word: "화이팅", s: "s2", left: "7%",  top: "32%", size: 17, rotate: "-6deg" },
  { word: "곧된다", s: "s3", left: "50%", top: "40%", size: 31 },
  { word: "할수있어", s: "s1", left: "12%", top: "60%", size: 14 },
  { word: "응원해",   s: "s2", left: "60%", top: "66%", size: 20, rotate: "4deg" },
  { word: "존경",   s: "s1", left: "40%", top: "78%", size: 13 },
  { word: "고생많아", s: "s2", left: "6%", top: "82%", size: 16 },
  { word: "힘내",   s: "s1", left: "70%", top: "24%", size: 14, rotate: "-3deg" },
];

const WORD_COLORS = {
  s1: "#8bb79f",
  s2: "#57a178",
  s3: "#1a8150",
} as const;

const WORD_WEIGHTS = {
  s1: 600,
  s2: 700,
  s3: 800,
} as const;

function WordmapPreview() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <p
        className="text-center mb-3 font-semibold"
        style={{ fontSize: 11.5, color: "#9C968B" }}
      >
        네 목표 위에, 응원이 이렇게 쌓여요
      </p>

      {/* 워드 클라우드 */}
      <div
        className="relative rounded-[24px] mx-auto w-full"
        style={{
          height: 200,
          maxWidth: 320,
          background:
            "radial-gradient(80% 80% at 50% 50%, #E7F4EC, #EEF6F0 70%, transparent)",
        }}
      >
        {PREVIEW_WORDS.map(({ word, s, left, top, size, rotate }) => (
          <span
            key={word}
            className="absolute whitespace-nowrap select-none"
            style={{
              left,
              top,
              fontSize: size,
              color: WORD_COLORS[s],
              fontWeight: WORD_WEIGHTS[s],
              transform: rotate ? `rotate(${rotate})` : undefined,
            }}
          >
            {word}
          </span>
        ))}
        {/* 클로버 산포 (절제) */}
        {[
          { left: "24%", top: "50%", size: 16, opacity: 0.5 },
          { left: "47%", top: "55%", size: 14, opacity: 0.4 },
          { left: "78%", top: "52%", size: 13, opacity: 0.45 },
        ].map((c, i) => (
          <svg
            key={i}
            width={c.size}
            height={c.size}
            viewBox="0 0 24 24"
            fill="#4aa877"
            style={{ position: "absolute", left: c.left, top: c.top, opacity: c.opacity }}
            aria-hidden="true"
          >
            <path d="M12 12c-1-3-5-4-6-1s2 5 6 1zm0 0c1-3 5-4 6-1s-2 5-6 1zm0 0c-3 1-4 5-1 6s5-2 1-6zm0 0c3 1 4 5 1 6s-5-2-1-6z" />
          </svg>
        ))}
      </div>

      <p
        className="text-center mt-3 font-semibold"
        style={{ fontSize: 11.5, color: "#6F6A60" }}
      >
        친구들이 🍀 클로버로 남긴 응원이에요 · 모이면 환전
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main
      className="flex flex-col min-h-svh px-[22px]"
      style={{
        background: "#FBFAF7",
        // DESIGN.md §5-5: clover 계열 radial (공간감 목적)
        backgroundImage:
          "radial-gradient(120% 60% at 50% 6%, rgba(31,158,90,.05), transparent 60%)",
      }}
    >
      {/* BrandMark */}
      <div className="pt-14 pb-0">
        <p
          className="font-extrabold"
          style={{ fontSize: 13, letterSpacing: "-0.2px", color: "#16140F" }}
        >
          해낼게
          <span style={{ color: "#1F9E5A" }}>.</span>
        </p>
      </div>

      {/* Hero */}
      <div className="text-center mt-7 mb-8 flex flex-col items-center gap-3.5">
        <h1
          className="font-black"
          style={{
            fontSize: 40,
            letterSpacing: "-1.4px",
            lineHeight: 1,
            color: "#16140F",
          }}
        >
          해낼게
          <span style={{ color: "#1F9E5A" }}>.</span>
        </h1>
        <p
          className="font-medium leading-snug"
          style={{ fontSize: 15.5, color: "#6F6A60" }}
        >
          응원은 돈으로 하는 겁니다.
        </p>
        {/* 궁금증 갭 훅 */}
        <span
          className="inline-block rounded-full font-bold"
          style={{
            fontSize: 12,
            color: "#14613A",
            background: "#E7F4EC",
            padding: "6px 13px",
          }}
        >
          그게 무슨 말이냐면 ↓
        </span>
      </div>

      {/* 워드맵 프리뷰 */}
      <div className="flex-1 flex flex-col justify-center mb-6">
        <WordmapPreview />
      </div>

      {/* CTA */}
      <div className="pb-10 flex flex-col gap-0">
        {/* 3스텝 안내 */}
        <div
          className="flex justify-center items-center gap-1.5 mb-3 font-semibold"
          style={{ fontSize: 10.5, color: "#9C968B" }}
        >
          <span>선언</span>
          <span style={{ opacity: 0.45 }}>›</span>
          <span>
            친구가{" "}
            <strong style={{ color: "#14613A", fontWeight: 700 }}>🍀로 응원</strong>
          </span>
          <span style={{ opacity: 0.45 }}>›</span>
          <span>
            모이면{" "}
            <strong style={{ color: "#14613A", fontWeight: 700 }}>환전</strong>
          </span>
        </div>

        {/* Primary CTA */}
        <Link
          href="/onboarding"
          className="block w-full text-center font-extrabold rounded-[15px] transition-opacity active:opacity-80"
          style={{
            padding: "16px",
            fontSize: 15.5,
            background: "#1B8A4F",
            color: "#ffffff",
            boxShadow: "0 6px 16px rgba(27,138,79,.22)",
            letterSpacing: "-0.2px",
          }}
          data-testid="landing-cta"
        >
          시작하기
        </Link>

        {/* Ghost CTA — 슬라이스 #9 how-to modal 연결 예정 */}
        <Link
          href="/how"
          prefetch={false}
          className="block w-full text-center font-semibold transition-opacity active:opacity-70"
          style={{
            fontSize: 13,
            color: "#6F6A60",
            padding: "12px",
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          data-testid="landing-how-cta"
          aria-label="어떻게 쓰는 건가요?"
        >
          어떻게 쓰는 건가요?
        </Link>
      </div>
    </main>
  );
}
