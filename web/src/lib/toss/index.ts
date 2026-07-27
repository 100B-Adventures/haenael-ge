// lib/toss/index.ts — 토스페이먼츠 결제위젯 로더 + ANONYMOUS 게스트 처리
// architecture §1: 간편결제(카카오페이·네이버페이·토스페이) 포함.

export interface TossWidgetOptions {
  clientKey: string;
  /** Supabase Auth user.id 또는 "anonymous-{uuid}" (게스트 결제) */
  customerKey: string;
}

export interface TossPaymentRequest {
  method: "CARD";
  amount: { value: number; currency: "KRW" };
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  customerName?: string;
  metadata?: Record<string, string>;
}

export interface TossPaymentClient {
  requestPayment(request: TossPaymentRequest): Promise<void>;
  destroy(): void;
}

export interface TossPaymentsClient {
  payment(params: { customerKey: string }): TossPaymentClient;
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsClient;
  }
}

const TOSS_SDK_SRC = "https://js.tosspayments.com/v2/standard";

/** 토스페이먼츠 v2 결제창 SDK를 script tag로 로드한다. */
export async function loadTossPayments(clientKey: string) {
  if (typeof window === "undefined") {
    throw new Error("TossPayments SDK can only load in browser");
  }
  if (!clientKey) {
    throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY is required");
  }
  if (window.TossPayments) {
    return window.TossPayments(clientKey);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TOSS_SDK_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Toss SDK load failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TOSS_SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Toss SDK load failed"));
    document.head.appendChild(script);
  });

  const tossPaymentsFactory = window.TossPayments as
    | ((nextClientKey: string) => TossPaymentsClient)
    | undefined;

  if (!tossPaymentsFactory) {
    throw new Error("TossPayments global not available after SDK load");
  }
  return tossPaymentsFactory(clientKey);
}
