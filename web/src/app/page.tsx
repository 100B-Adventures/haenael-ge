// page.tsx — ① 랜딩 (받는사람 존 입구)
// DESIGN.md: landing-final. 슬라이스 #4(goal/cheer UI) 에서 실구현.
// 지금은 온보딩 진입 CTA stub.

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-svh px-6 text-center gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">해낼게</h1>
        <p className="text-lg text-muted-foreground">
          응원은 돈으로 하는 겁니다.
        </p>
      </div>

      <Link
        href="/(receiver)/onboarding"
        className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-8 py-4 text-base font-semibold"
        data-testid="landing-cta"
      >
        목표 쓰러 가기
      </Link>

      {/* TODO(slice-4): 랜딩 파이널 디자인 구현 (WIREFRAMES/01-landing.md 참조) */}
    </main>
  );
}
