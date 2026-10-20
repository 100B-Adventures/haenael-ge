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

function WordmapPreview() {
  const messages = [
    ["너라면 할 수 있어", "strong"],
    ["오늘도 한 걸음 ♥", "medium"],
    ["끝까지 가보자", "soft"],
    ["진짜 멋지다", "medium"],
    ["꼭 해낼 거야", "strong"],
    ["내가 옆에 있을게", "soft"],
  ] as const;
  return (
    <div className="landing-wordmap-preview" aria-label="응원 메시지 예시">
      <span className="landing-preview-heart landing-preview-heart--left" aria-hidden="true">♥</span>
      <span className="landing-preview-heart landing-preview-heart--right" aria-hidden="true">♥</span>
      {messages.map(([message, tone]) => (
        <span key={message} className={`landing-preview-message is-${tone}`}>
          {message}
        </span>
      ))}
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
    <main className="landing-approved">
      {/* BrandMark — 클릭 시 홈(로그인 상태면 /me, 비로그인이면 랜딩 자기 자신) */}
      <div className="landing-approved-wordmark">
        <Link
          href={user ? "/me" : "/"}
          className="inline-flex min-h-[var(--tap-min-size)] min-w-[var(--tap-min-size)] items-center font-extrabold transition-opacity active:opacity-70 [font-size:13px]! [letter-spacing:-0.2px]! [color:var(--foreground)]!"
          data-testid="brand-logo-link"
          aria-label="해낼게 홈으로"
        >
          해낼게
          <span className="[color:var(--clover-bright)]!">.</span>
        </Link>
      </div>

      {/* Hero */}
      <div className="landing-approved-hero">
        <h1>
          해낼게
          <span className="[color:var(--clover-bright)]!">.</span>
        </h1>
        <p>
          응원은 돈으로 하는 겁니다.
        </p>
        <span>
          그게 무슨 말이냐면 ↓
        </span>
      </div>

      {/* 워드맵 프리뷰 */}
      <div className="landing-approved-preview">
        <WordmapPreview />
      </div>

      {/* CTA */}
      <div className="landing-approved-actions">
        {/* 3스텝 안내 */}
        <div className="landing-approved-steps">
          <span>선언</span>
          <span className="[opacity:0.45]!">›</span>
          <span>
            친구가{" "}
            <strong>
              🍀로 응원
            </strong>
          </span>
          <span className="[opacity:0.45]!">›</span>
          <span>
            <strong>
              응원이 쌓여요
            </strong>
          </span>
        </div>

        {/* Primary CTA */}
        <Link
          href="/onboarding"
          className="landing-approved-primary"
          data-testid="landing-cta"
        >
          시작하기
        </Link>

        {/* Ghost CTA — 슬라이스 #9 how-to modal 연결 예정 */}
        <Link
          href="/how"
          prefetch={false}
          className="landing-approved-ghost"
          data-testid="landing-how-cta"
          aria-label="어떻게 쓰는 건가요?"
        >
          어떻게 쓰는 건가요?
        </Link>

        {/* 재로그인 진입 (user-flow.md §1.3 갭2) — 주 CTA와 시각적으로 구분되되
            "로그인"임을 명확히 읽히게: 라벨(muted)+동사(강조 underline)로 분리 */}
        <p className="landing-approved-relogin">
          <span>이미 계정이 있으신가요?</span>
          {/* prefetch 를 끈다. Next 가 이 경로를 미리 가져가면 서버가 302 로
              kauth.kakao.com 을 가리키고, 그 크로스 오리진 요청이 우리 CSP
              connect-src 에 막혀 모든 방문자 콘솔에 에러가 찍힌다. 카카오는
              최상위 리다이렉트로만 쓰므로 CSP 를 여는 대신 prefetch 를 끈다. */}
          <Link
            href="/auth/kakao/start?redirect=/me"
            prefetch={false}
            className="landing-approved-relogin-link"
            data-testid="landing-relogin-link"
          >
            카카오로 로그인
          </Link>
        </p>
      </div>
    </main>
    </ReceiverAppShell>
  );
}
