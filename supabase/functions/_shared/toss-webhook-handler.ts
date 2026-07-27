// toss-webhook-handler.ts — TossPayments 웹훅 순수 로직 (Deno 런타임 무관).
// toss-webhook/index.ts(Deno.serve 얇은 래퍼)에서 supabase/toss/sendSlackAlert를
// 주입받아 호출된다. fetch/Request/Response/Headers 표준 API만 사용하므로
// vitest에서 상대경로 import로 직접 요청 단위 테스트가 가능하다
// (web/src/lib/__tests__/toss-cancel.test.ts와 동일한 패턴).
//
// 리팩터링 원칙: 기존 toss-webhook/index.ts의 로직을 동작 변경 없이 그대로 옮긴다.
// (Codex 최종 재리뷰 P2 — 요청 단위 회귀테스트 부재 해소 목적, docs 근거:
// docs/test-plan.md SEC-6, supabase/tests/release_v1.test.sql:71-103)

// 이 파일은 로컬 상대경로 import를 일절 쓰지 않는다(zero local imports — toss.ts와 같은 원칙).
// 이유: Deno는 상대 import에 명시적 ".ts" 확장자를 요구하지만, web/의 tsconfig(bundler
// moduleResolution, allowImportingTsExtensions 미설정)는 ".ts" 확장자 명시 import를 거부한다.
// 또한 slack.ts처럼 함수 본문에서 Deno.env.get을 쓰는 파일을 (타입 전용이라도) import하면
// web tsc 프로그램이 그 파일 전체를 풀 타입체크하며 "Cannot find name 'Deno'"로 실패한다.
// 그래서 필요한 타입(SlackAlert·TossPaymentResponse 일부)은 실제 소스(./slack.ts·./toss.ts)와
// 필드가 1:1 동일하도록 여기 로컬로 재선언한다 — 구조적 타이핑이라 index.ts에서 실제
// TossClient/sendSlackAlert를 그대로 주입해도 컴파일된다(반드시 shape을 동기화 유지할 것).
export interface SlackAlert {
  event: string;
  severity?: "info" | "warning" | "critical";
  summary: string;
  fields?: Record<string, string | number | boolean | null>;
}

/** ./toss.ts의 TossPaymentResponse와 필드 1:1 동일 (구조적 타이핑용 로컬 재선언). */
export interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  approvedAt: string;
  receiptUrl?: string;
  canceledAt?: string;
}

export interface TossWebhookSupabaseClient {
  rpc(
    name: string,
    args: Record<string, unknown>,
    // supabase-js의 rpc()는 Promise가 아니라 thenable(PostgrestFilterBuilder)을 돌려준다.
    // PromiseLike로 받아야 실제 클라이언트를 그대로 주입할 수 있다(TS2322 방지).
  ): PromiseLike<{ data?: unknown; error: { code?: string } | null }>;
}

export interface TossWebhookTossClient {
  getPayment(paymentKey: string): Promise<TossPaymentResponse>;
}

export interface TossWebhookDeps {
  /** TOSS_WEBHOOK_TOKEN env 값. 미설정이면 항상 401. */
  expectedToken: string | undefined;
  /** 미주입(undefined)이면 503 missing_server_env. */
  supabase: TossWebhookSupabaseClient | undefined;
  /** 미주입(undefined)이면 503 missing_server_env. */
  toss: TossWebhookTossClient | undefined;
  sendSlackAlert: (alert: SlackAlert) => Promise<boolean>;
}

// ./region.ts의 withRegionHeader와 동일 동작(x-region: ap-northeast-2 핀 — architecture §2.6)을
// 로컬 import 없이 인라인한다. 이유는 상단 주석 참조.
function json(status: number, body: unknown): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set("x-region", "ap-northeast-2");
  return new Response(JSON.stringify(body), { status, headers });
}

export function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export async function handleTossWebhook(
  req: Request,
  deps: TossWebhookDeps,
): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const suppliedToken = new URL(req.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  if (!deps.expectedToken || !constantTimeEqual(suppliedToken, deps.expectedToken)) {
    return json(401, { error: "unauthorized" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  // req.json()은 유효한 JSON이어도 결과가 null/배열/원시값(string·number·boolean)일 수 있다.
  // 그 경우 try/catch는 안 걸리므로(파싱 자체는 성공) 아래서 body.eventType 접근 시
  // null이면 런타임 예외(unhandled → 500/워커 크래시)가, 배열·원시값이면 오토박싱으로
  // 조용히 undefined가 되어 200 ignored로 새 나간다. 둘 다 방지하는 명시 shape 가드.
  // (typeof null === "object"라 별도 === null 체크가 필수, 배열도 typeof는 "object"라
  // Array.isArray 체크가 별도로 필요 — Codex 최종 리뷰 P2 지적.)
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { error: "invalid_payload" });
  }
  if (body.eventType !== "PAYMENT_STATUS_CHANGED" || typeof body.data !== "object" || !body.data) {
    return json(200, { ignored: true });
  }

  const incoming = body.data as Record<string, unknown>;
  const paymentKey = typeof incoming.paymentKey === "string" ? incoming.paymentKey : "";
  if (!paymentKey) return json(400, { error: "payment_key_required" });

  if (!deps.supabase || !deps.toss) return json(503, { error: "missing_server_env" });
  const { supabase, toss, sendSlackAlert } = deps;

  let payment: TossPaymentResponse;
  try {
    payment = await toss.getPayment(paymentKey);
  } catch (error) {
    console.error("[toss-webhook] authoritative lookup failed", error);
    await sendSlackAlert({
      event: "toss_webhook_lookup_failed",
      severity: "critical",
      summary: "Could not verify Toss webhook against Toss API",
    });
    return json(502, { error: "verification_failed" });
  }

  const incomingOrderId = typeof incoming.orderId === "string" ? incoming.orderId : null;
  const incomingAmount = typeof incoming.totalAmount === "number" ? incoming.totalAmount : null;
  const incomingStatus = typeof incoming.status === "string" ? incoming.status : null;
  if (
    (incomingOrderId !== null && payment.orderId !== incomingOrderId) ||
    (incomingAmount !== null && payment.totalAmount !== incomingAmount) ||
    (incomingStatus !== null && payment.status !== incomingStatus)
  ) {
    await sendSlackAlert({
      event: "toss_webhook_mismatch",
      severity: "critical",
      summary: "Webhook payload did not match authoritative Toss payment",
      fields: { orderId: payment.orderId },
    });
    return json(400, { error: "payload_mismatch" });
  }

  if (payment.status === "DONE") {
    const { error } = await supabase.rpc("confirm_cheer_payment", {
      p_order_id: payment.orderId,
      p_payment_key: payment.paymentKey,
      p_amount_krw: payment.totalAmount,
      p_method: payment.method,
      p_approved_at: payment.approvedAt || null,
      p_receipt_url: payment.receiptUrl ?? null,
      p_raw_response: { source: "toss-webhook", status: payment.status },
    });
    if (error) {
      console.error("[toss-webhook] DONE reconcile failed", error.code);
      await sendSlackAlert({
        event: "payment_reconcile_failed",
        severity: "critical",
        summary: "DONE webhook could not be reconciled",
        fields: { orderId: payment.orderId, code: error.code ?? "unknown" },
      });
      return json(500, { error: "reconcile_failed" });
    }
  } else if (payment.status === "CANCELED" || payment.status === "PARTIAL_CANCELED") {
    if (payment.status === "PARTIAL_CANCELED") {
      const { error } = await supabase.rpc("record_partial_cancel_review", {
        p_order_id: payment.orderId,
        p_payment_key: payment.paymentKey,
        p_amount_krw: payment.totalAmount,
        p_detail: { status: payment.status, canceledAt: payment.canceledAt ?? null },
      });
      if (error) return json(500, { error: "partial_cancel_review_failed" });
      await sendSlackAlert({
        event: "partial_cancel_requires_review",
        severity: "critical",
        summary: "Partial cancellation is outside v1.0.0 contract",
        fields: { orderId: payment.orderId },
      });
      return json(200, { processed: true, reviewRequired: true });
    }
    const { data, error } = await supabase.rpc("reconcile_canceled_payment", {
      p_order_id: payment.orderId,
      p_payment_key: payment.paymentKey,
      p_amount_krw: payment.totalAmount,
      p_detail: { status: payment.status, canceledAt: payment.canceledAt ?? null },
    });
    if (error) {
      console.error("[toss-webhook] cancellation reconcile failed", error.code);
      await sendSlackAlert({
        event: "payment_cancel_reconcile_failed",
        severity: "critical",
        summary: "Canceled payment could not be reversed",
        fields: { orderId: payment.orderId, code: error.code ?? "unknown" },
      });
      return json(500, { error: "cancel_reconcile_failed" });
    }
    // reconcile_canceled_payment(20260716120000)이 잔액부족으로 자동 원장 역산이
    // 불가능할 때 예외 대신 durable risk marker로 수렴하며 review_required=true를
    // 반환한다. 이 경우 Toss는 이미 CANCELED가 확인됐으므로 웹훅은 200으로
    // 정상 종료하되(재시도 무한반복 방지), 수동검토가 필요함을 Slack으로 알린다.
    const reconcileRow = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
    if (reconcileRow?.review_required) {
      await sendSlackAlert({
        event: "payment_cancel_balance_insufficient",
        severity: "critical",
        summary: "Canceled payment could not be reversed — clover balance insufficient, manual reconciliation required",
        fields: { orderId: payment.orderId },
      });
      return json(200, { processed: true, reviewRequired: true });
    }
  } else {
    return json(200, { ignored: true, status: payment.status });
  }

  return json(200, { processed: true, status: payment.status });
}
