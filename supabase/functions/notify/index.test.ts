// notify — Deno 단위 테스트
// 실 Supabase 연동 없이 입력 검증·로직만 테스트.
// 알림톡 실발송 = ⛔ (카카오 비즈채널 셋업 필요)

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCheerReceivedMessage,
  sendAlimtalk,
  TEMPLATE_CODES,
} from "../_shared/alimtalk.ts";

// ─── alimtalk 헬퍼 단위 테스트 ──────────────────────────────────────────────

Deno.test("buildCheerReceivedMessage — 올바른 메시지 구조 반환", () => {
  const msg = buildCheerReceivedMessage("01012345678", {
    displayName: "도경이",
    goalTitle: "편입 평점 4.0 해낼게",
  });

  assertEquals(msg.to, "01012345678");
  assertEquals(msg.templateCode, TEMPLATE_CODES.CHEER_RECEIVED);
  assertEquals(msg.variables["#{응원자}"], "도경이");
  assertEquals(msg.variables["#{목표}"], "편입 평점 4.0 해낼게");
});

Deno.test("buildCheerReceivedMessage — goalTitle 30자 초과 시 truncate", () => {
  const longTitle = "가".repeat(40);
  const msg = buildCheerReceivedMessage("01012345678", {
    displayName: "응원자",
    goalTitle: longTitle,
  });

  assertEquals(msg.variables["#{목표}"].length, 30);
});

Deno.test("sendAlimtalk — ENV 미설정 시 FAILED(placeholder) 반환", async () => {
  // 테스트 환경에서는 ENV 미설정 → placeholder 모드
  const result = await sendAlimtalk({
    to: "01099999999",
    templateCode: "TEST_TEMPLATE",
    variables: { "#{이름}": "테스터" },
  });

  assertEquals(result.status, "FAILED");
  assertEquals(
    result.error,
    "KAKAO_ALIMTALK env not configured",
  );
});

Deno.test("TEMPLATE_CODES — CHEER_RECEIVED 값 존재", () => {
  // ENV 미설정 → fallback default
  assertEquals(typeof TEMPLATE_CODES.CHEER_RECEIVED, "string");
  assertEquals(TEMPLATE_CODES.CHEER_RECEIVED.length > 0, true);
});

// ─── notify EF 입력 검증 로직 독립 테스트 ────────────────────────────────────

interface NotifyInput {
  memberId: string;
  type: "CHEER_RECEIVED";
  phone?: string;
  displayName?: string;
  goalTitle?: string;
}

function validate(body: unknown): { data: NotifyInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "body must be JSON object" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.memberId !== "string" || !b.memberId) {
    return { error: "memberId required (string)" };
  }
  if (b.type !== "CHEER_RECEIVED") {
    return { error: "type must be CHEER_RECEIVED" };
  }
  return {
    data: {
      memberId: b.memberId as string,
      type: "CHEER_RECEIVED",
      phone: typeof b.phone === "string" ? b.phone : undefined,
      displayName: typeof b.displayName === "string"
        ? b.displayName
        : "익명의 누군가",
      goalTitle: typeof b.goalTitle === "string" ? b.goalTitle : "목표",
    },
  };
}

Deno.test("validate — memberId 없으면 에러", () => {
  const result = validate({ type: "CHEER_RECEIVED" });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("memberId"), true);
  }
});

Deno.test("validate — type 오류 시 에러", () => {
  const result = validate({ memberId: "uuid-1", type: "UNKNOWN" });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("type"), true);
  }
});

Deno.test("validate — 정상 입력 파싱", () => {
  const result = validate({
    memberId: "aaaaaaaa-0000-0000-0000-000000000001",
    type: "CHEER_RECEIVED",
    phone: "01012345678",
    displayName: "도경이",
    goalTitle: "편입 해낼게",
  });

  assertEquals("data" in result, true);
  if ("data" in result) {
    assertEquals(result.data.memberId, "aaaaaaaa-0000-0000-0000-000000000001");
    assertEquals(result.data.phone, "01012345678");
    assertEquals(result.data.displayName, "도경이");
  }
});

Deno.test("validate — phone 없으면 undefined (INAPP 폴백)", () => {
  const result = validate({
    memberId: "uuid-1",
    type: "CHEER_RECEIVED",
  });
  assertEquals("data" in result, true);
  if ("data" in result) {
    assertEquals(result.data.phone, undefined);
    assertEquals(result.data.displayName, "익명의 누군가");
    assertEquals(result.data.goalTitle, "목표");
  }
});
