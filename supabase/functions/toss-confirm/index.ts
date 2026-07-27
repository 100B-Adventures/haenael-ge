// toss-confirm — POST: 서버승인 + payment DONE + cheer CONFIRMED + ledger EARN
// architecture: 토스 서버승인(paymentKey+orderId+amount) → 원장 EARN → cheer CONFIRMED 원자적.
//
// 알림(N1/N2, 2026-07-20): 받는사람(goal 소유자) 인앱 알림(notification INSERT,
// channel=INAPP)은 confirm_cheer_payment RPC 내부에서 같은 트랜잭션으로 생성된다
// (supabase/migrations/20260720010000_cheer_notification_insert.sql) — 이 EF는
// 알림을 직접 다루지 않는다. TODO: member.phone 컬럼 확보 후 여기서 notify EF
// (supabase/functions/notify/index.ts)를 호출해 카카오 알림톡(N2, channel=ALIMTALK)
// 채널을 얹는다. 현재는 phone이 없어 notify EF의 alimtalk 분기가 죽은 코드다.

import { createClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";
import { TossClient } from "../_shared/toss.ts";
import { toPublicError } from "../_shared/errors.ts";
import { sendSlackAlert } from "../_shared/slack.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
    ),
  });
}

function sanitizedConfirmResponse(confirm: {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method: string;
  approvedAt: string;
  receiptUrl?: string;
}) {
  return {
    source: "toss-confirm",
    paymentKey: confirm.paymentKey,
    orderId: confirm.orderId,
    status: confirm.status,
    totalAmount: confirm.totalAmount,
    method: confirm.method,
    approvedAt: confirm.approvedAt,
    receiptUrl: confirm.receiptUrl ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withRegionHeader(new Headers(CORS_HEADERS)),
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed", message: "POST only" } });
  }

  if (Deno.env.get("PAYMENTS_ENABLED") !== "true") {
    return json(503, { error: { code: "payments_disabled", message: "응원 결제를 준비하고 있습니다." } });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: { code: "unauthorized", message: "Authorization required" } });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: "invalid_json", message: "body must be JSON" } });
  }

  const paymentKey = typeof body.paymentKey === "string" ? body.paymentKey.trim() : "";
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const amount = Number(body.amount);

  if (!paymentKey || !orderId || !Number.isInteger(amount) || amount < 1000) {
    return json(400, {
      error: { code: "validation_error", message: "paymentKey, orderId, amount required" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");
  if (!supabaseUrl || !serviceKey) {
    await sendSlackAlert({ event: "toss_confirm_missing_env", severity: "critical", summary: "toss-confirm missing Supabase service env" });
    return json(503, {
      error: { code: "missing_supabase_env", message: "Supabase service env missing" },
    });
  }
  if (!tossSecretKey) {
    await sendSlackAlert({ event: "toss_confirm_missing_env", severity: "critical", summary: "toss-confirm missing TOSS_SECRET_KEY" });
    return json(503, {
      error: { code: "missing_toss_secret", message: "TOSS_SECRET_KEY missing" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingPayment, error: paymentLookupErr } = await supabase
    .from("payment")
    .select("id,amount_krw,status")
    .eq("order_id", orderId)
    .single();

  if (paymentLookupErr || !existingPayment) {
    return json(404, { error: { code: "payment_not_found", message: "주문을 찾을 수 없음" } });
  }
  if (existingPayment.amount_krw !== amount) {
    return json(400, { error: { code: "amount_mismatch", message: "주문 금액 불일치" } });
  }

  if (existingPayment.status === "DONE") {
    const { data, error } = await supabase.rpc("confirm_cheer_payment", {
      p_order_id: orderId,
      p_payment_key: paymentKey,
      p_amount_krw: amount,
      p_method: null,
      p_approved_at: null,
      p_receipt_url: null,
      p_raw_response: { idempotent: true },
    });

    if (error || !data?.[0]) {
      // 원문은 서버 로그에만 — 클라이언트엔 화이트리스트로 매핑된 안전한 코드+메시지만.
      console.error("[toss-confirm] idempotent confirm failed:", error);
      await sendSlackAlert({ event: "toss_confirm_idempotent_failed", severity: "warning", summary: "Idempotent replay confirm failed", fields: { orderId, code: error?.code ?? "unknown" } });
      return json(409, { error: toPublicError(error?.message) });
    }

    return json(200, {
      paymentId: data[0].payment_id,
      cheerId: data[0].cheer_id,
      memberId: data[0].member_id,
      goalTitle: data[0].goal_title,
      displayName: data[0].display_name,
      idempotent: true,
    });
  }

  const toss = new TossClient(tossSecretKey);
  let confirm;
  try {
    confirm = await toss.confirmPayment({ paymentKey, orderId, amount });
  } catch (e) {
    // 원문(Toss 벤더 예외 메시지)은 서버 로그에만 — 클라이언트엔 고정 공개 메시지만.
    console.error("[toss-confirm] Toss confirm failed:", e);
    await sendSlackAlert({ event: "toss_confirm_failed", severity: "critical", summary: "Toss payment confirmation failed" });
    return json(502, { error: toPublicError("toss_confirm_failed") });
  }

  if (confirm.status !== "DONE" || confirm.totalAmount !== amount) {
    return json(400, {
      error: {
        code: "invalid_toss_status",
        message: "Toss confirm response is not DONE or amount mismatch",
      },
    });
  }

  const confirmExtended = confirm as typeof confirm & { receiptUrl?: string; raw?: unknown };
  const { data, error } = await supabase.rpc("confirm_cheer_payment", {
    p_order_id: orderId,
    p_payment_key: confirm.paymentKey,
    p_amount_krw: amount,
    p_method: confirm.method,
    p_approved_at: confirm.approvedAt,
    p_receipt_url: confirmExtended.receiptUrl ?? null,
    p_raw_response: sanitizedConfirmResponse(confirm),
  });

  if (error || !data?.[0]) {
    console.error("[toss-confirm] confirm_cheer_payment failed:", error);
    await sendSlackAlert({ event: "payment_reconcile_started", severity: "critical", summary: "Toss approved but database confirmation failed", fields: { orderId, amount } });
    let compensated = false;
    let compensationError: string | undefined;
    let compensationRecorded = false;
    const compensationDetail = {
      originalErrorCode: error?.code ?? "confirm_failed",
      originalErrorMessage: error?.message ?? "결제 반영 실패",
    };
    try {
      await toss.cancelPayment(
        confirm.paymentKey,
        "해낼게 DB 반영 실패로 인한 자동 취소",
      );
      compensated = true;
    } catch (cancelErr) {
      compensationError =
        cancelErr instanceof Error ? cancelErr.message : "Toss cancel failed";
      console.error("[toss-confirm] Toss cancel compensation failed:", cancelErr);
    }

    const { error: recordErr } = await supabase.rpc("record_payment_compensation", {
      p_order_id: orderId,
      p_payment_key: confirm.paymentKey,
      p_amount_krw: amount,
      p_target_status: compensated ? "CANCELED" : "FAILED",
      p_detail: {
        ...compensationDetail,
        compensation: compensated ? "toss_cancelled" : "manual_reconcile_required",
        compensationError: compensationError ?? null,
      },
    });
    if (recordErr) {
      console.error("[toss-confirm] compensation audit failed:", recordErr);
    } else {
      compensationRecorded = true;
    }

    // 클라이언트 응답: code는 화이트리스트 매핑(모르는 라벨은 internal_error)만,
    // message는 고정 공개 문구만. compensationError(Toss cancel 벤더 원문)는 절대
    // 응답 바디에 싣지 않고 boolean 플래그로만 노출 — 원문은 위 console.error에만 남는다.
    return json(500, {
      error: {
        code: toPublicError(error?.message).code,
        message: compensated
          ? "결제 반영 실패로 승인 취소 처리했습니다."
          : "결제 승인 후 반영 실패. 운영자 확인이 필요합니다.",
        compensation: compensated ? "toss_cancelled" : "manual_reconcile_required",
        compensationRecorded,
        compensationErrorOccurred: compensationError !== undefined,
      },
    });
  }

  return json(200, {
    paymentId: data[0].payment_id,
    cheerId: data[0].cheer_id,
    memberId: data[0].member_id,
    goalTitle: data[0].goal_title,
    displayName: data[0].display_name,
  });
});
