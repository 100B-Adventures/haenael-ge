// payout.ts — TossPayoutClient (지급대행) — 자체 구현
// 슬라이스 #1 scaffold: 인터페이스 stub. 실구현은 슬라이스 #8 (강모델·Codex 게이트).

export interface PayoutRequest {
  /** 수취인 계좌 정보 */
  bankCode: string;
  accountNumber: string;
  holderName: string;
  /** 지급 금액 (KRW, 원화 정수) */
  amount: number;
  /** 지급 고유키 (멱등) */
  requestId: string;
}

export interface PayoutResponse {
  requestId: string;
  status: "REQUESTED" | "COMPLETED" | "FAILED";
  transferredAt?: string;
}

/** ⚠️ 슬라이스 #8(cashout-payout) 에서 강모델로 구현 — PASS KYC·payout 순서 포함 */
export class TossPayoutClient {
  constructor(private readonly secretKey: string) {
    if (!secretKey) throw new Error("TOSS_PAYOUT_SECRET_KEY is required");
  }

  async requestPayout(req: PayoutRequest): Promise<PayoutResponse> {
    throw new Error("Not implemented — 슬라이스 #8 에서 구현");
  }
}
