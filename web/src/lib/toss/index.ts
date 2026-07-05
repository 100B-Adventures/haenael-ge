// lib/toss/index.ts — 토스페이먼츠 결제위젯 로더 + ANONYMOUS 게스트 처리
// 슬라이스 #1 scaffold: 타입 + 로더 stub. 실구현은 슬라이스 #5(cheer-order).
// architecture §1: 간편결제(카카오페이·네이버페이·토스페이) 포함.

export interface TossWidgetOptions {
  clientKey: string;
  /** Supabase Auth user.id 또는 "anonymous-{uuid}" (게스트 결제) */
  customerKey: string;
}

/** 토스페이먼츠 결제위젯 스크립트 로드 (동적 import) */
export async function loadTossPayments(clientKey: string) {
  // TODO(slice-5): @tosspayments/tosspayments-js 동적 로드
  // const { loadTossPayments } = await import("@tosspayments/tosspayments-js");
  // return loadTossPayments(clientKey);
  throw new Error("Not implemented — 슬라이스 #5 에서 구현");
}
