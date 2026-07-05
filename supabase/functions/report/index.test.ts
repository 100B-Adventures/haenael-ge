// report — Deno 단위 테스트 (입력 검증 로직)
// 실 Supabase 연동 없이 validation만 독립 테스트.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// validate 함수를 복제해 독립 테스트 (EF와 동일 로직)
interface ReportInput {
  targetType: "GOAL" | "CHEER";
  targetId: number;
  reason: string;
  reporterRef?: string;
}

function validate(body: unknown): { data: ReportInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "body must be JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (b.targetType !== "GOAL" && b.targetType !== "CHEER") {
    return { error: "targetType must be GOAL or CHEER" };
  }
  if (
    typeof b.targetId !== "number" ||
    !Number.isInteger(b.targetId) ||
    b.targetId <= 0
  ) {
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
      reporterRef: typeof b.reporterRef === "string"
        ? b.reporterRef
        : undefined,
    },
  };
}

// ─── 정상 케이스 ────────────────────────────────────────────────────────────

Deno.test("validate — GOAL 신고 정상", () => {
  const result = validate({
    targetType: "GOAL",
    targetId: 1,
    reason: "스팸성 목표입니다",
  });
  assertEquals("data" in result, true);
  if ("data" in result) {
    assertEquals(result.data.targetType, "GOAL");
    assertEquals(result.data.targetId, 1);
    assertEquals(result.data.reason, "스팸성 목표입니다");
  }
});

Deno.test("validate — CHEER 신고 정상", () => {
  const result = validate({
    targetType: "CHEER",
    targetId: 42,
    reason: "부적절한 메시지",
  });
  assertEquals("data" in result, true);
  if ("data" in result) {
    assertEquals(result.data.targetType, "CHEER");
    assertEquals(result.data.targetId, 42);
  }
});

Deno.test("validate — reason 공백 trim 처리", () => {
  const result = validate({
    targetType: "GOAL",
    targetId: 1,
    reason: "   스팸   ",
  });
  assertEquals("data" in result, true);
  if ("data" in result) {
    assertEquals(result.data.reason, "스팸");
  }
});

// ─── 오류 케이스 ────────────────────────────────────────────────────────────

Deno.test("validate — body null 에러", () => {
  const result = validate(null);
  assertEquals("error" in result, true);
});

Deno.test("validate — targetType 누락 에러", () => {
  const result = validate({ targetId: 1, reason: "테스트" });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("targetType"), true);
  }
});

Deno.test("validate — targetType 잘못된 값 에러", () => {
  const result = validate({ targetType: "MEMBER", targetId: 1, reason: "테스트" });
  assertEquals("error" in result, true);
});

Deno.test("validate — targetId 0 에러 (양수만 허용)", () => {
  const result = validate({ targetType: "GOAL", targetId: 0, reason: "테스트" });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("targetId"), true);
  }
});

Deno.test("validate — targetId 음수 에러", () => {
  const result = validate({ targetType: "GOAL", targetId: -1, reason: "테스트" });
  assertEquals("error" in result, true);
});

Deno.test("validate — targetId 소수 에러", () => {
  const result = validate({ targetType: "GOAL", targetId: 1.5, reason: "테스트" });
  assertEquals("error" in result, true);
});

Deno.test("validate — reason 공백만 에러", () => {
  const result = validate({ targetType: "GOAL", targetId: 1, reason: "   " });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("reason"), true);
  }
});

Deno.test("validate — reason 빈 문자열 에러", () => {
  const result = validate({ targetType: "GOAL", targetId: 1, reason: "" });
  assertEquals("error" in result, true);
});

Deno.test("validate — reason 500자 초과 에러", () => {
  const longReason = "가".repeat(501);
  const result = validate({ targetType: "GOAL", targetId: 1, reason: longReason });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("500"), true);
  }
});

Deno.test("validate — reason 정확히 500자 통과", () => {
  const reason = "가".repeat(500);
  const result = validate({ targetType: "GOAL", targetId: 1, reason });
  assertEquals("data" in result, true);
});
