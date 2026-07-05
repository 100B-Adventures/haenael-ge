// (receiver)/onboarding/page.tsx — ① write-first 온보딩
// 서버 컴포넌트: 세션 확인 후 OnboardingGoalForm에 user 전달.
// DESIGN.md §7-2: write-first 확정. 로그인은 저장 시점에만.
// 슬라이스 #4 실구현.

import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OnboardingGoalForm } from "@/components/receiver/OnboardingGoalForm";

export const metadata: Metadata = {
  title: "목표 쓰기 — 해낼게",
  description: "나만의 목표를 작성하고 친구들의 응원을 받아보세요.",
};

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main
      className="min-h-svh"
      style={{ background: "#FBFAF7" }}
      data-testid="onboarding-page"
    >
      <OnboardingGoalForm initialUser={user} />
    </main>
  );
}
