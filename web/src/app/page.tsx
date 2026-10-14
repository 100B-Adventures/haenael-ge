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
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReceiverAppShell } from "@/components/receiver/ReceiverShell";

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
  {
    word: "화이팅",
    s: "s2",
    left: "7%",
    top: "32%",
    size: 17,
    rotate: "-6deg",
  },
  { word: "곧된다", s: "s3", left: "50%", top: "40%", size: 31 },
  { word: "할수있어", s: "s1", left: "12%", top: "60%", size: 14 },
  {
    word: "응원해",
    s: "s2",
    left: "60%",
    top: "66%",
    size: 20,
    rotate: "4deg",
  },
  { word: "존경", s: "s1", left: "40%", top: "78%", size: 13 },
  { word: "고생많아", s: "s2", left: "6%", top: "82%", size: 16 },
  { word: "힘내", s: "s1", left: "70%", top: "24%", size: 14, rotate: "-3deg" },
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
      <p className="text-center mb-3 font-semibold [font-size:11.5px]! [color:var(--faint)]!">
        네 목표 위에, 응원이 이렇게 쌓여요
      </p>

      {/* 워드 클라우드 */}
      <div className="relative rounded-[24px] mx-auto w-full [height:200px]! [max-width:320px]! [background-image:radial-gradient(80%_80%_at_50%_50%,_var(--accent),_#EEF6F0_70%,_transparent)]!">
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
            className="[position:absolute]!"
            key={i}
            width={c.size}
            height={c.size}
            viewBox="0 0 24 24"
            fill="#4aa877"
            style={{ left: c.left, top: c.top, opacity: c.opacity }}
            aria-hidden="true"
          >
            <path d="M12 12c-1-3-5-4-6-1s2 5 6 1zm0 0c1-3 5-4 6-1s-2 5-6 1zm0 0c-3 1-4 5-1 6s5-2 1-6zm0 0c3 1 4 5 1 6s-5-2-1-6z" />
          </svg>
        ))}
      </div>

      <p className="text-center mt-3 font-semibold [font-size:11.5px]! [color:var(--muted-foreground)]!">
        친구들이 🍀 클로버로 남긴 응원이에요
      </p>
    </div>
  );
}

export default async function LandingPage() {
  // user-flow.md §1.3 (a) 세션 라우팅: 세션 有 + 본인 goal 有 → /me 리다이렉트(재방문 편의).
  // 비로그인은 SSR·OG 무변경 — 아래에서 return하지 않고 그대로 통과.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // goal_select_own RLS(auth.uid()=member_id)로 자동 스코프 — 남의 goal은 절대 안 걸림.
    const { data: goals } = await supabase
      .from("goal")
      .select("id")
      .eq("member_id", user.id)
      .neq("status", "DELETED")
      .is("deleted_at", null)
      .limit(1);

    if (goals && goals.length > 0) {
      redirect("/me"); // goal 있는 세션만 이동 — 무한루프 없음(/me는 goal 없을 때만 /onboarding으로 감)
    }
  }

  return (
    <ReceiverAppShell locked currentPath="/">
    <main className="flex flex-col min-h-[calc(100svh-var(--tabbar-height))] px-[22px] [background-color:var(--background)]! [background-image:radial-gradient(120%_60%_at_50%_6%,_rgba(31,158,90,.05),_transparent_60%)]!">
      {/* BrandMark — 클릭 시 홈(로그인 상태면 /me, 비로그인이면 랜딩 자기 자신) */}
      <div className="pt-14 pb-0">
        <Link
          href={user ? "/me" : "/"}
          className="inline-block font-extrabold transition-opacity active:opacity-70 [font-size:13px]! [letter-spacing:-0.2px]! [color:var(--foreground)]!"
          data-testid="brand-logo-link"
          aria-label="해낼게 홈으로"
        >
          해낼게
          <span className="[color:var(--clover-bright)]!">.</span>
        </Link>
      </div>

      {/* Hero */}
      <div className="text-center mt-7 mb-8 flex flex-col items-center gap-3.5">
        <h1 className="font-black [font-size:40px]! [letter-spacing:-1.4px]! [line-height:1]! [color:var(--foreground)]!">
          해낼게
          <span className="[color:var(--clover-bright)]!">.</span>
        </h1>
        <p className="font-medium leading-snug [font-size:15.5px]! [color:var(--muted-foreground)]!">
          응원은 돈으로 하는 겁니다.
        </p>
        {/* 궁금증 갭 훅 */}
        <span className="inline-block rounded-full font-bold [font-size:12px]! [color:var(--accent-foreground)]! [background-color:var(--accent)]! p-[6px_13px]!">
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
        <div className="flex justify-center items-center gap-1.5 mb-3 font-semibold [font-size:10.5px]! [color:var(--faint)]!">
          <span>선언</span>
          <span className="[opacity:0.45]!">›</span>
          <span>
            친구가{" "}
            <strong className="[color:var(--accent-foreground)]! [font-weight:700]!">
              🍀로 응원
            </strong>
          </span>
          <span className="[opacity:0.45]!">›</span>
          <span>
            <strong className="[color:var(--accent-foreground)]! [font-weight:700]!">
              응원이 쌓여요
            </strong>
          </span>
        </div>

        {/* Primary CTA */}
        <Link
          href="/onboarding"
          className="block w-full text-center font-extrabold rounded-[15px] transition-opacity active:opacity-80 p-[16px]! [font-size:15.5px]! [background-color:var(--primary)]! [color:var(--card)]! [box-shadow:0_6px_16px_rgba(27,138,79,.22)]! [letter-spacing:-0.2px]!"
          data-testid="landing-cta"
        >
          시작하기
        </Link>

        {/* Ghost CTA — 슬라이스 #9 how-to modal 연결 예정 */}
        <Link
          href="/how"
          prefetch={false}
          className="block w-full text-center font-semibold transition-opacity active:opacity-70 [font-size:13px]! [color:var(--muted-foreground)]! p-[12px]! [min-height:44px]! [display:flex]! [align-items:center]! [justify-content:center]!"
          data-testid="landing-how-cta"
          aria-label="어떻게 쓰는 건가요?"
        >
          어떻게 쓰는 건가요?
        </Link>

        {/* 재로그인 진입 (user-flow.md §1.3 갭2) — 주 CTA와 시각적으로 구분되되
            "로그인"임을 명확히 읽히게: 라벨(muted)+동사(강조 underline)로 분리 */}
        <p className="w-full text-center [font-size:12.5px]! [color:var(--faint)]! p-[10px_6px_4px]! [display:flex]! [align-items:center]! [justify-content:center]! gap-[4px]!">
          <span>이미 계정이 있으신가요?</span>
          {/* prefetch 를 끈다. Next 가 이 경로를 미리 가져가면 서버가 302 로
              kauth.kakao.com 을 가리키고, 그 크로스 오리진 요청이 우리 CSP
              connect-src 에 막혀 모든 방문자 콘솔에 에러가 찍힌다. 카카오는
              최상위 리다이렉트로만 쓰므로 CSP 를 여는 대신 prefetch 를 끈다. */}
          <Link
            href="/auth/kakao/start?redirect=/me"
            prefetch={false}
            className="font-bold underline underline-offset-2 transition-opacity active:opacity-70 [color:var(--accent-foreground)]!"
            data-testid="landing-relogin-link"
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
    </ReceiverAppShell>
  );
}
