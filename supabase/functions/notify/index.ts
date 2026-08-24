// notify — 카카오 알림톡 발송(응원 도착·환전 신청 접수·환전 지급 완료 등 정보성) + 인앱 폴백
// ⚠️ 정보성만(마케팅/광고성 금지) — design-patterns §11c.
// 호출 방식: service_role 내부 호출 (web server action, toss-confirm EF 등에서 invoke).
//
// 요청:
//   POST /functions/v1/notify
//   Authorization: Bearer <SERVICE_ROLE_KEY>
//   Body: {
//     memberId: string,        // 받는사람 uuid
//     type: "CHEER_RECEIVED" | "CASHOUT_REQUESTED" | "CASHOUT_PAID",
//     phone?: string,          // 없으면 INAPP 폴백
//     // CHEER_RECEIVED 전용:
//     displayName?: string,    // 응원자 이름 ("익명의 누군가" 등)
//     goalTitle?: string,      // 목표 제목
//     // CASHOUT_PAID 전용 (필수):
//     bankName?: string,       // 은행명만 — 계좌번호는 절대 싣지 않는다(회장 결정)
//   }
//
// 응답: { notificationId: number, channel: "ALIMTALK" | "INAPP", alimtalkStatus?: "SENT" | "FAILED" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withRegionHeader } from "../_shared/region.ts";
import { sendAlimtalk } from "../_shared/alimtalk.ts";
import {
  buildNotifyMessage,
  validateNotifyInput,
} from "../_shared/notify-message.ts";

// ─── CORS ───────────────────────────────────────────────────────────────────
// report EF와 동일 버그(2026-07-20 수정): OPTIONS만 CORS를 붙이고 실제 응답엔
// 안 붙어 있었다. 내부(service_role) 호출이 주지만 브라우저 경유 호출도 막지
// 않도록 전 응답에 통일 적용.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ─── 에러 응답 헬퍼 ─────────────────────────────────────────────────────────
function err(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    {
      status,
      headers: withRegionHeader(
        new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
      ),
    },
  );
}

// ─── 메인 핸들러 ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withRegionHeader(new Headers(CORS_HEADERS)),
    });
  }

  if (req.method !== "POST") {
    return err(405, "method_not_allowed", "POST only");
  }

  // 내부 서비스 호출 확인 — Authorization: Bearer <SERVICE_ROLE_KEY>
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!serviceRoleKey) {
    return err(503, "missing_supabase_env", "Supabase service env missing");
  }

  // service_role 토큰이 아니면 내부 호출 거부. Gateway JWT 검증만으로는 일반
  // 로그인 사용자 토큰도 통과하므로 실제 service key와 반드시 대조한다.
  if (!token) {
    return err(401, "unauthorized", "Authorization required");
  }
  if (token !== serviceRoleKey) {
    return err(403, "forbidden", "Service role required");
  }

  // 입력 파싱
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return err(400, "invalid_json", "body must be valid JSON");
  }

  const validated = validateNotifyInput(rawBody);
  if ("error" in validated) {
    return err(400, "validation_error", validated.error);
  }
  const input = validated.data;

  // Supabase Admin 클라이언트 (service_role — notification INSERT 권한)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ── 알림톡 발송 시도 ────────────────────────────────────────────────────
  let alimtalkStatus: "SENT" | "FAILED" | null = null;
  let channel: "ALIMTALK" | "INAPP" = "INAPP";

  if (input.phone) {
    channel = "ALIMTALK";
    const alimtalkMsg = buildNotifyMessage(input, input.phone);

    const result = await sendAlimtalk(alimtalkMsg);
    alimtalkStatus = result.status;

    if (result.status === "FAILED") {
      // 발송 실패 → INAPP 폴백
      channel = "INAPP";
      console.warn(
        `[notify] 알림톡 발송 실패 → INAPP 폴백. error=${result.error}`,
      );
    }
  }

  // ── notification INSERT ──────────────────────────────────────────────────
  const { data: notif, error: insertErr } = await supabase
    .from("notification")
    .insert({
      member_id: input.memberId,
      type: input.type,
      channel,
      alimtalk_status: alimtalkStatus,
      read: false,
    })
    .select("id")
    .single();

  if (insertErr || !notif) {
    console.error("[notify] notification INSERT 실패:", insertErr);
    return err(500, "db_error", "notification insert failed");
  }

  return new Response(
    JSON.stringify({
      notificationId: notif.id,
      channel,
      alimtalkStatus,
    }),
    {
      status: 200,
      headers: withRegionHeader(
        new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
      ),
    },
  );
});
