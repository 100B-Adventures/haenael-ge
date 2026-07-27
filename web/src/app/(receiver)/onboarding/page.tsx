// (receiver)/onboarding/page.tsx — ① write-first 온보딩
// 서버 컴포넌트: 세션 확인 후 OnboardingGoalForm에 user 전달.
// DESIGN.md §7-2: write-first 확정. 로그인은 저장 시점에만.
// 슬라이스 #4 실구현.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

  // QA 갭 수정(2026-07-20): 이미 활성 목표가 있는 로그인 유저는 폼을 보여준 뒤
  // 저장 시점에야 DB 제약(goal_one_active_per_member)으로 막는 UX 대신,
  // 서버에서 즉시 /me로 리다이렉트한다. "활성 목표" 정의는 앱 전역과 동일하게
  // status != 'DELETED' AND deleted_at IS NULL (20260720000001 fix 반영).
  if (user) {
    const { data: goals } = await supabase
      .from("goal")
      .select("id")
      .eq("member_id", user.id)
      .neq("status", "DELETED")
      .is("deleted_at", null)
      .limit(1);

    if (goals && goals.length > 0) {
      redirect("/me");
    }
  }

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
