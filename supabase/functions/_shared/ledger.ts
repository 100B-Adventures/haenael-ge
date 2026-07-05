// ledger.ts — clover 원장 기입 헬퍼 (EARN/HOLD/SETTLE/REVERSAL)
// 슬라이스 #1 scaffold: 타입 + 인터페이스 stub. 실구현은 슬라이스 #5+ (마이그레이션 #3 이후)

export type LedgerAction = "EARN" | "HOLD" | "SETTLE" | "REVERSAL";

export interface LedgerEntry {
  userId: string;
  action: LedgerAction;
  /** 클로버 단위 (1 클로버 = 1 KRW, 서버 내부) */
  amount: number;
  /** 관련 payment_id 또는 cashout_request_id */
  referenceId: string;
  note?: string;
}

/** ⚠️ 슬라이스 #3(마이그레이션 clover_ledger 테이블) 이후 실구현 */
export async function appendLedger(
  _supabaseServiceRole: unknown,
  _entry: LedgerEntry,
): Promise<void> {
  throw new Error("Not implemented — 슬라이스 #3 마이그레이션 후 구현");
}
