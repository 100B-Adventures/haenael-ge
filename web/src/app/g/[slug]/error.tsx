"use client";

// g/[slug]/error.tsx — 친구뷰 목표 로드 일시 실패 시 재시도 카드.
// page.tsx가 goal_public 조회 오류를 throw하면 여기서 잡아 "다시 불러오기"를 제공한다
// (과거: 일시 조회오류를 notFound()로 처리해 정상 목표가 간헐 404로 보이던 버그의 짝).

import { useEffect } from "react";

export default function GoalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[g/slug] load error:", error);
  }, [error]);

  return (
    <main
      className="min-h-svh flex flex-col items-center justify-center px-[22px] text-center [background-color:var(--background)]!"
      data-testid="goal-error-card"
    >
      <p className="text-[20px] font-bold mb-2 [color:var(--foreground)]!">
        잠시 후 다시 시도해 주세요
      </p>
      <p className="text-[14px] mb-6 [color:var(--muted-foreground)]!">
        목표를 불러오지 못했어요. 네트워크 문제일 수 있어요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-[14px] px-6 py-3 text-[15px] font-extrabold text-white [background-color:var(--primary)]!"
        data-testid="goal-error-retry"
      >
        다시 불러오기
      </button>
    </main>
  );
}
