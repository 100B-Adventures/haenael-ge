"use client";

// (receiver)/me/error.tsx — 목록 로드 실패 error 카드
// user-flow.md §1.3 시나리오 7: "목록 로드 실패 → /me error 카드 '다시 불러오기'"
//
// ⛔ 회수 필요(범위 판단): 이상적으로는 "잔액 표시는 유지"까지 구현하려면 클로버 잔액 카드를
// 별도 서버 컴포넌트/suspense 경계로 분리해 부분 에러바운더리를 둬야 한다(page.tsx 전체를
// 하나의 async 서버 컴포넌트로 둔 현재 구조상, Next.js error.tsx는 라우트 세그먼트 전체를
// 대체한다 — 부분 유지가 불가능). 이번 수정은 MVP 스코프로 "전체 재시도" 카드까지만
// 구현하고, 잔액 유지형 부분 에러바운더리는 별도 슬라이스로 회장 판단을 받는다.

import { useEffect } from "react";

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[me] load error:", error);
  }, [error]);

  return (
    <main
      className="min-h-svh flex flex-col items-center justify-center px-[22px] text-center [background-color:var(--background)]!"
      data-testid="me-error-card"
    >
      <p className="text-[18px] font-bold mb-2 [color:var(--foreground)]!">
        불러오지 못했어요
      </p>
      <p className="text-[13.5px] mb-6 [color:var(--muted-foreground)]!">
        네트워크 상태를 확인하고 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="py-3 px-6 rounded-[14px] text-[14px] font-semibold [background-color:var(--primary)]! [color:var(--card)]!"
        data-testid="me-error-retry"
      >
        다시 불러오기
      </button>
    </main>
  );
}
