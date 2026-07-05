// idempotency.ts — 멱등키·중복 차단
// 슬라이스 #1 scaffold: 인터페이스 stub. 실구현은 슬라이스 #5 (cheer-order, UNIQUE(order_id) DB 제약 이후)

/**
 * 동일한 orderId로 두 번 처리되지 않도록 차단.
 * DB 레벨: payment 테이블 UNIQUE(order_id) + Postgres ON CONFLICT DO NOTHING.
 * EF 레벨: 이 함수가 선처리 가드 역할.
 */
export async function checkIdempotency(
  _supabaseServiceRole: unknown,
  _orderId: string,
): Promise<{ isDuplicate: boolean }> {
  throw new Error("Not implemented — 슬라이스 #5 에서 구현");
}
