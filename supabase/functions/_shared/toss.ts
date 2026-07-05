// toss.ts — TossClient (결제 confirm/cancel, 간편결제) — 자체 구현
// 슬라이스 #1 scaffold: 인터페이스 stub. 실구현은 슬라이스 #5~7 (강모델·Codex 게이트).

export interface TossConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  approvedAt: string;
}

/** ⚠️ 슬라이스 #5~7 실구현 대기 — B2(돈) 슬라이스에서 강모델로 구현 */
export class TossClient {
  private readonly baseUrl = "https://api.tosspayments.com/v1";

  constructor(private readonly secretKey: string) {
    if (!secretKey) throw new Error("TOSS_SECRET_KEY is required");
  }

  async confirmPayment(req: TossConfirmRequest): Promise<TossConfirmResponse> {
    throw new Error("Not implemented — 슬라이스 #5(toss-confirm) 에서 구현");
  }

  async cancelPayment(paymentKey: string, cancelReason: string): Promise<void> {
    throw new Error("Not implemented — 슬라이스 #6 에서 구현");
  }
}
