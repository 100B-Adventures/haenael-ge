// toss.ts — TossPayments REST client.
// B2 결제 해피패스는 confirmPayment로 승인하고, 취소/환불은 다음 돈 슬라이스에서 연다.

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
  receiptUrl?: string;
  raw?: unknown;
}

export interface TossCancelResponse {
  paymentKey: string;
  status: string;
  canceledAt?: string;
  raw?: unknown;
}

export interface TossPaymentResponse extends TossConfirmResponse {
  canceledAt?: string;
}

export class TossClient {
  private readonly baseUrl = "https://api.tosspayments.com/v1";

  constructor(private readonly secretKey: string) {
    if (!secretKey) throw new Error("TOSS_SECRET_KEY is required");
  }

  private authorizationHeader(): string {
    return `Basic ${btoa(`${this.secretKey}:`)}`;
  }

  async getPayment(paymentKey: string): Promise<TossPaymentResponse> {
    const res = await fetch(`${this.baseUrl}/payments/${encodeURIComponent(paymentKey)}`, {
      headers: { Authorization: this.authorizationHeader() },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Toss payment lookup failed (${res.status})`);
    if (body.paymentKey !== paymentKey || typeof body.orderId !== "string") {
      throw new Error("Toss payment lookup identity mismatch");
    }
    const totalAmount = Number(body.totalAmount);
    if (!Number.isInteger(totalAmount)) throw new Error("Toss payment lookup amount missing");
    return {
      paymentKey,
      orderId: body.orderId,
      status: String(body.status ?? ""),
      totalAmount,
      method: String(body.method ?? body.easyPay?.provider ?? "UNKNOWN"),
      approvedAt: typeof body.approvedAt === "string" ? body.approvedAt : "",
      receiptUrl: typeof body.receipt?.url === "string" ? body.receipt.url : undefined,
      canceledAt: Array.isArray(body.cancels) && typeof body.cancels.at(-1)?.canceledAt === "string" ? body.cancels.at(-1).canceledAt : undefined,
      raw: body,
    };
  }

  async confirmPayment(req: TossConfirmRequest): Promise<TossConfirmResponse> {
    const res = await fetch(`${this.baseUrl}/payments/confirm`, {
      method: "POST",
      headers: {
        Authorization: this.authorizationHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof body?.message === "string"
          ? body.message
          : `Toss confirm failed (${res.status})`;
      throw new Error(message);
    }

    const paymentKey = typeof body.paymentKey === "string" ? body.paymentKey : "";
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const totalAmount = Number(body.totalAmount);
    const approvedAt = typeof body.approvedAt === "string" ? body.approvedAt : "";

    if (paymentKey !== req.paymentKey || orderId !== req.orderId) {
      throw new Error("Toss confirm response identity mismatch");
    }
    if (!Number.isInteger(totalAmount)) {
      throw new Error("Toss confirm response amount missing");
    }
    if (!approvedAt) {
      throw new Error("Toss confirm response approvedAt missing");
    }

    return {
      paymentKey,
      orderId,
      status: String(body.status ?? ""),
      totalAmount,
      method: String(body.method ?? body.easyPay?.provider ?? "UNKNOWN"),
      approvedAt,
      receiptUrl: typeof body.receipt?.url === "string" ? body.receipt.url : undefined,
      raw: body,
    };
  }

  async cancelPayment(paymentKey: string, cancelReason: string): Promise<TossCancelResponse> {
    const res = await fetch(`${this.baseUrl}/payments/${paymentKey}/cancel`, {
      method: "POST",
      headers: {
        Authorization: this.authorizationHeader(),
        "Content-Type": "application/json",
      },
      // 전액취소: cancelAmount 미지정 = 전액. (부분취소 API가 아님 — B2는 부분환불 미지원.)
      body: JSON.stringify({ cancelReason }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof body?.message === "string"
          ? body.message
          : `Toss cancel failed (${res.status})`;
      throw new Error(message);
    }

    // 응답 body의 paymentKey가 요청 paymentKey와 다르면, 우리가 취소했다고 믿는 결제가
    // 실제로는 다른 결제일 수 있다 — 보상(compensation) 무결성이 깨지므로 성공으로 간주하지 않는다.
    const responsePaymentKey = typeof body.paymentKey === "string" ? body.paymentKey : "";
    if (responsePaymentKey !== paymentKey) {
      throw new Error("Toss cancel response paymentKey mismatch");
    }

    // 토스 공식문서(Payment 객체): 취소 성공 시 status는 CANCELED(전액취소) 또는
    // PARTIAL_CANCELED(부분취소) 중 하나다. 이 클라이언트는 cancelAmount를 보내지 않는
    // 전액취소 요청만 하므로, 응답이 CANCELED가 아니면(예: 이전 부분취소 이력이 있어
    // PARTIAL_CANCELED로 응답하는 등) 실제로 전액취소가 완료된 것이 아니다 — throw해서
    // 상위(toss-confirm)가 "보상 성공"으로 잘못 처리하지 않게 한다.
    const status = typeof body.status === "string" ? body.status : "";
    if (status !== "CANCELED") {
      throw new Error(`Toss cancel response status is not CANCELED: ${status || "unknown"}`);
    }

    return {
      paymentKey: responsePaymentKey,
      status,
      canceledAt: typeof body.canceledAt === "string" ? body.canceledAt : undefined,
      raw: body,
    };
  }
}
