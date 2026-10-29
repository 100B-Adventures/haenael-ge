// cheer-order — POST: cheer=PENDING + payment 주문·멱등
// architecture: service_role, 멱등(UNIQUE order_id), 원장 HOLD 없음(주문=PENDING).

import { createClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";
import { toPublicError, toPublicHttpStatus } from "../_shared/errors.ts";
import { sendSlackAlert } from "../_shared/slack.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 클로버 자유입력(2026-07-21, 회장 지시): 4종 화이트리스트 → 1,000원 배수 + 상한.
// DB(create_cheer_order/confirm_cheer_payment, 20260721000000_cheer_amount_unbounded.sql)와
// 동일 규약을 EF 레이어에서도 미리 검증(빠른 실패). 진실원은 DB — 여기는 얕은 방어.
const MIN_AMOUNT_KRW = 1000;
const MAX_AMOUNT_KRW = 100_000_000; // 1억원(=100,000클로버) 안전 상한

function isValidAmount(amountKrw: number): boolean {
  return (
    Number.isInteger(amountKrw) &&
    amountKrw >= MIN_AMOUNT_KRW &&
    amountKrw <= MAX_AMOUNT_KRW &&
    amountKrw % 1000 === 0
  );
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
    ),
  });
}

function makeOrderId(): string {
  return `hnl_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

function normalizeCustomerKey(input: unknown): string {
  if (typeof input === "string" && /^[A-Za-z0-9_=.@-]{22,50}$/.test(input)) {
    return input;
  }
  return `anonymous_${crypto.randomUUID()}`;
}

const REQUEST_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

function normalizeRequestKey(input: unknown): { ok: true; value: string | null } | { ok: false } {
  if (input === undefined || input === null || input === "") {
    return { ok: true, value: null };
  }
  if (typeof input === "string" && REQUEST_KEY_PATTERN.test(input)) {
    return { ok: true, value: input };
  }
  return { ok: false };
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

  const goalId = Number(body.goalId);
  const amountKrw = Number(body.amountKrw);
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const isAnonymous = body.isAnonymous === true;
  const customerKey = normalizeCustomerKey(body.customerKey);

  if (!Number.isInteger(goalId) || goalId <= 0) {
    return json(400, { error: { code: "invalid_goal", message: "goalId required" } });
  }
  if (!isValidAmount(amountKrw)) {
    return json(400, {
      error: {
        code: "invalid_amount",
        message: `amountKrw는 1,000원 단위 정수이며 ${MIN_AMOUNT_KRW}~${MAX_AMOUNT_KRW} 범위여야 합니다`,
      },
    });
  }
  // 클로버 환산은 서버가 유일 진실원: 1클로버=1,000원. 클라이언트가 보낸 cloverAmount는
  // 신뢰하지 않고 amountKrw로 재계산한다. ★검증(화이트리스트) 통과 뒤에만 나눗셈 —
  // 미검증 입력을 먼저 연산하지 않는 신뢰경계 준수(Codex 리뷰 2026-07-20).
  const cloverAmount = amountKrw / 1000;
  if (displayName.length > 30) {
    return json(400, { error: { code: "invalid_name", message: "displayName max 30 chars" } });
  }
  if (message.length > 140) {
    return json(400, { error: { code: "invalid_message", message: "message max 140 chars" } });
  }

  // 요청 멱등키(선택): 클라이언트 재시도가 새 payment/cheer 행을 만들지 않게 한다.
  // 미제공(기존 호출)은 그대로 허용 — 하위호환 유지.
  const requestKeyResult = normalizeRequestKey(body.requestKey);
  if (!requestKeyResult.ok) {
    return json(400, {
      error: { code: "invalid_request_key", message: "requestKey는 8~128자여야 합니다" },
    });
  }
  const requestKey = requestKeyResult.value;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    await sendSlackAlert({ event: "cheer_order_missing_env", severity: "critical", summary: "cheer-order missing Supabase service env" });
    return json(503, {
      error: { code: "missing_supabase_env", message: "Supabase service env missing" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 로그인한 회원이 공개 목표에서 결제하는 경우에만 회원-응원 귀속을 남긴다.
  // anon key 호출은 기존 비회원 결제와 동일하게 귀속 없이 진행한다. 원문 JWT나
  // 사용자 식별자는 payment/cheer 공개 계약과 응답에 포함하지 않는다.
  const accessToken = authHeader.slice("Bearer ".length);
  const { data: { user: supporter } } = await supabase.auth.getUser(
    accessToken,
  );

  const orderId = makeOrderId();
  const { data, error } = await supabase.rpc("create_cheer_order", {
    p_goal_id: goalId,
    p_order_id: orderId,
    p_amount_krw: amountKrw,
    p_clover_amount: cloverAmount,
    p_display_name: displayName,
    p_is_anonymous: isAnonymous,
    p_message: message,
    p_pg_customer_key: customerKey,
    p_request_key: requestKey,
  });

  if (error || !data?.[0]) {
    // 원문(error.message/error.code)은 Postgres 내부 라벨·SQLSTATE — 클라이언트엔
    // 화이트리스트로 매핑된 안전한 코드+메시지만 보낸다. 상세는 서버 로그에만.
    console.error("[cheer-order] create_cheer_order failed:", error);
    await sendSlackAlert({ event: "cheer_order_failed", severity: "warning", summary: "Payment order creation failed", fields: { code: error?.code ?? "unknown" } });
    return json(toPublicHttpStatus(error?.message), { error: toPublicError(error?.message) });
  }

  const row = data[0] as {
    payment_id: number;
    cheer_id: number;
    order_id: string;
    is_replay: boolean;
  };

  // replay는 최초 주문의 호출자 신원을 증명하지 못한다. 다른 로그인 사용자가 같은
  // fingerprint를 재현해 attribution을 선점하지 못하도록 신규 주문에만 귀속한다.
  if (supporter && !row.is_replay) {
    const { error: attributionError } = await supabase
      .from("social_cheer_member_attribution")
      .upsert({
        cheer_id: row.cheer_id,
        supporter_member_id: supporter.id,
      }, { onConflict: "cheer_id", ignoreDuplicates: true });
    if (attributionError) {
      console.error(
        "[cheer-order] supporter attribution failed:",
        attributionError.code,
      );
      await sendSlackAlert({
        event: "cheer_supporter_attribution_failed",
        severity: "warning",
        summary: "Authenticated cheer attribution failed",
        fields: { code: attributionError.code ?? "unknown" },
      });
    }
  }

  return json(row.is_replay ? 200 : 201, {
    orderId: row.order_id,
    amountKrw,
    cloverAmount,
    customerKey,
    orderName: "해낼게 조용한 응원",
    paymentId: row.payment_id,
    cheerId: row.cheer_id,
    ...(row.is_replay ? { idempotent: true } : {}),
  });
});
