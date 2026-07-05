// report — 신고 접수 (R1)
// 게스트·비로그인·인증 유저 모두 신고 가능. RLS report_insert_any 정책으로 보호.
// MVP: INSERT → 운영자 수동 검토 → 대상 deleted_at set (soft-delete).
// admin UI = 나중(운영량 넘을 때). FDD F7.
//
// 요청:
//   POST /functions/v1/report
//   Authorization: Bearer <anon_key> (or service_role — 게스트 가능)
//   Body: {
//     targetType: "GOAL" | "CHEER",
//     targetId: number,
//     reason: string,   // 1~500자
//   }
//
// 응답: { reportId: number }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withRegionHeader } from "../_shared/region.ts";

// ─── 에러 응답 헬퍼 ─────────────────────────────────────────────────────────
function err(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    {
      status,
      headers: withRegionHeader(
        new Headers({ "Content-Type": "application/json" }),
      ),
    },
  );
}

// ─── 입력 검증 ──────────────────────────────────────────────────────────────
interface ReportInput {
  targetType: "GOAL" | "CHEER";
  targetId: number;
  reason: string;
  reporterRef?: string; // 신고자 식별자 (인증 유저: auth.uid, 게스트: null)
}

function validate(body: unknown): { data: ReportInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "body must be JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (b.targetType !== "GOAL" && b.targetType !== "CHEER") {
    return { error: "targetType must be GOAL or CHEER" };
  }
  if (typeof b.targetId !== "number" || !Number.isInteger(b.targetId) || b.targetId <= 0) {
    return { error: "targetId must be a positive integer" };
  }
  if (typeof b.reason !== "string" || b.reason.trim().length < 1) {
    return { error: "reason required (min 1 char)" };
  }
  if (b.reason.length > 500) {
    return { error: "reason too long (max 500 chars)" };
  }

  return {
    data: {
      targetType: b.targetType as "GOAL" | "CHEER",
      targetId: b.targetId as number,
      reason: (b.reason as string).trim(),
      reporterRef: typeof b.reporterRef === "string" ? b.reporterRef : undefined,
    },
  };
}

// ─── 대상 존재 확인 ─────────────────────────────────────────────────────────
async function targetExists(
  supabaseAdmin: ReturnType<typeof createClient>,
  targetType: "GOAL" | "CHEER",
  targetId: number,
): Promise<boolean> {
  if (targetType === "GOAL") {
    const { data } = await supabaseAdmin
      .from("goal")
      .select("id")
      .eq("id", targetId)
      .is("deleted_at", null)
      .single();
    return !!data;
  } else {
    const { data } = await supabaseAdmin
      .from("cheer")
      .select("id")
      .eq("id", targetId)
      .is("deleted_at", null)
      .single();
    return !!data;
  }
}

// ─── 메인 핸들러 ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withRegionHeader(
        new Headers({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }),
      ),
    });
  }

  if (req.method !== "POST") {
    return err(405, "method_not_allowed", "POST only");
  }

  // 인증 토큰 추출 (게스트/인증 모두 허용)
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) {
    return err(401, "unauthorized", "Authorization required (anon key 이상)");
  }

  // 입력 파싱
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return err(400, "invalid_json", "body must be valid JSON");
  }

  const validated = validate(rawBody);
  if ("error" in validated) {
    return err(400, "validation_error", validated.error);
  }
  const input = validated.data;

  // Admin 클라이언트 (service_role) — 대상 존재 확인 + INSERT
  // report_insert_any 정책(WITH CHECK true)이 있으므로 service_role은 항상 INSERT 가능.
  // 신고자 식별자는 JWT에서 파싱(라이브러리 세션 의존 X).
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  // 대상 존재 확인 (이미 삭제된 대상은 신고 불가 — 의미 없음)
  const exists = await targetExists(supabaseAdmin, input.targetType, input.targetId);
  if (!exists) {
    return err(404, "target_not_found", "신고 대상을 찾을 수 없습니다 (이미 삭제됐거나 존재하지 않음)");
  }

  // 신고자 uuid 추출 — JWT payload에서 파싱 (sub claim)
  // anon key의 경우 sub 없음 → null (개인정보 최소 수집)
  let reporterRef: string | null = null;
  try {
    // JWT는 Base64URL 인코딩: header.payload.sig
    const payloadB64 = token.split(".")[1];
    if (payloadB64) {
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
      // 인증된 유저(카카오/구글/게스트 익명)는 sub=uuid
      // anon role JWT(API key)는 sub 없음
      if (payload.sub && payload.role !== "anon") {
        reporterRef = payload.sub as string;
      }
    }
  } catch {
    // JWT 파싱 실패 → reporterRef = null (무방)
  }

  // report INSERT (service_role으로 — report_insert_any 정책이 anon/authenticated 모두 허용)
  const { data: report, error: insertErr } = await supabaseAdmin
    .from("report")
    .insert({
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      reporter_ref: reporterRef,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (insertErr || !report) {
    console.error("[report] INSERT 실패:", insertErr);
    return err(500, "db_error", "신고 접수 실패. 잠시 후 재시도해주세요.");
  }

  return new Response(
    JSON.stringify({ reportId: report.id }),
    {
      status: 201,
      headers: withRegionHeader(
        new Headers({ "Content-Type": "application/json" }),
      ),
    },
  );
});
