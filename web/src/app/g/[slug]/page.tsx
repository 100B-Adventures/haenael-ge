// g/[slug]/page.tsx — ② 친구 목표페이지 (공유 링크 타깃, 비로그인 SSR)
// folder-structure.md: "goal_public RLS 읽기 · 결제시트 · 마감"
// 슬라이스 #1 scaffold stub. 실구현은 슬라이스 #4.
// URL: 해낼게.app/g/{slug}

import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

// SSR: goal_public 뷰 (금액 필드 부재) 에서 메타 데이터 생성
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} — 해낼게`,
    description: "친구의 목표를 응원하세요.",
  };
}

export default async function GoalPublicPage({ params }: Props) {
  const { slug } = await params;

  return (
    <main
      className="flex flex-col items-center justify-center min-h-svh px-6"
      data-testid="goal-public-page"
    >
      <p className="text-muted-foreground">
        목표 페이지 ({slug}) — 슬라이스 #4 에서 구현
      </p>
      {/* TODO(slice-4): goal_public 뷰 SSR + PaymentSheet + 마감 상태 */}
    </main>
  );
}
