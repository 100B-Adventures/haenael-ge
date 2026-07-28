// ledger.ts — legacy clover 원장 타입.
// B2 결제 원장은 confirm_cheer_payment RPC가 payment/cheer와 같은 트랜잭션에서 쓴다.

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

export async function appendLedger(
  supabaseServiceRole: {
    from: (table: string) => {
      select: (columns: string) => unknown;
    };
  },
  entry: LedgerEntry,
): Promise<void> {
  // B2 결제 경로는 DB RPC(confirm_cheer_payment)가 원자적으로 원장을 쓴다.
  // 이 함수는 이전 scaffold API 호환용이며 직접 호출하지 않는다.
  void supabaseServiceRole;
  void entry;
  throw new Error("appendLedger is superseded by confirm_cheer_payment RPC");
}
