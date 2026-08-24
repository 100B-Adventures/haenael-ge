// notify — Deno 단위 테스트
// 실 Supabase 연동 없이 입력 검증·로직만 테스트.
// 알림톡 실발송 = ⛔ (카카오 비즈채널 셋업 필요)

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCheerReceivedMessage,
  sendAlimtalk,
  TEMPLATE_CODES,
} from "../_shared/alimtalk.ts";
import {
  buildNotifyMessage,
  validateNotifyInput,
} from "../_shared/notify-message.ts";

// ─── alimtalk 헬퍼 단위 테스트 ──────────────────────────────────────────────

Deno.test("buildCheerReceivedMessage — 올바른 메시지 구조 반환", () => {
  const msg = buildCheerReceivedMessage("01012345678", {
    displayName: "도경이",
    goalTitle: "편입 평점 4.0 해낼게",
  });

  assertEquals(msg.to, "01012345678");
  assertEquals(msg.templateId, TEMPLATE_CODES.CHEER_RECEIVED);
  assertEquals(msg.variables["#{응원자}"], "도경이");
  assertEquals(msg.variables["#{목표}"], "편입 평점 4.0 해낼게");
  assertEquals(
    Object.keys(msg.variables).sort(),
    ["#{목표}", "#{응원자}"].sort(),
  );
  assertEquals("#{금액}" in msg.variables, false);
  assertEquals("#{클로버}" in msg.variables, false);
});

Deno.test("buildCheerReceivedMessage — goalTitle 30자 초과 시 truncate", () => {
  const longTitle = "가".repeat(40);
  const msg = buildCheerReceivedMessage("01012345678", {
    displayName: "응원자",
    goalTitle: longTitle,
  });

  assertEquals(msg.variables["#{목표}"].length, 30);
});

Deno.test("sendAlimtalk — templateId 미발급 시 FAILED(placeholder) 반환", async () => {
  const result = await sendAlimtalk({
    to: "01099999999",
    templateId: "",
    variables: { "#{이름}": "테스터" },
  });

  assertEquals(result.status, "FAILED");
  assertEquals(
    result.error,
    "KAKAO_ALIMTALK env not configured",
  );
});

Deno.test("TEMPLATE_CODES — 승인된 templateId를 환경변수로 주입", () => {
  assertEquals(
    TEMPLATE_CODES.CHEER_RECEIVED,
    Deno.env.get("KAKAO_ALIMTALK_TEMPLATE_CHEER_RECEIVED")?.trim() ?? "",
  );
});

// ─── notify EF 입력 검증·타입별 빌더 단위 테스트 ─────────────────────────────

Deno.test("validateNotifyInput — 알림 3종 타입과 각 필수 입력을 받는다", () => {
  const inputs = [
    {
      memberId: "member-1",
      type: "CHEER_RECEIVED",
      displayName: "응원자",
      goalTitle: "편입 해낼게",
    },
    { memberId: "member-1", type: "CASHOUT_REQUESTED" },
    { memberId: "member-1", type: "CASHOUT_PAID", bankName: "KB국민은행" },
  ] as const;

  for (const input of inputs) {
    const result = validateNotifyInput(input);
    assertEquals("data" in result, true);
    if ("data" in result) assertEquals(result.data.type, input.type);
  }
});

Deno.test("buildNotifyMessage — 타입별 템플릿과 최소 변수만 선택한다", () => {
  const requested = buildNotifyMessage({
    memberId: "member-1",
    type: "CASHOUT_REQUESTED",
  }, "01012345678");
  const paid = buildNotifyMessage({
    memberId: "member-1",
    type: "CASHOUT_PAID",
    bankName: "KB국민은행",
  }, "01012345678");

  assertEquals(requested.templateId, TEMPLATE_CODES.CASHOUT_REQUESTED);
  assertEquals(requested.variables, {});
  assertEquals(paid.templateId, TEMPLATE_CODES.CASHOUT_PAID);
  assertEquals(paid.variables, { "#{은행}": "KB국민은행" });
  assertEquals("#{금액}" in paid.variables, false);
  assertEquals("#{계좌}" in paid.variables, false);
});

Deno.test("validate — memberId 없으면 에러", () => {
  const result = validateNotifyInput({ type: "CHEER_RECEIVED" });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("memberId"), true);
  }
});

Deno.test("validate — type 오류 시 에러", () => {
  const result = validateNotifyInput({ memberId: "uuid-1", type: "UNKNOWN" });
  assertEquals("error" in result, true);
  if ("error" in result) {
    assertEquals(result.error.includes("type"), true);
  }
});

Deno.test("validate — 정상 입력 파싱", () => {
  const result = validateNotifyInput({
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
  const result = validateNotifyInput({
    memberId: "uuid-1",
    type: "CHEER_RECEIVED",
    displayName: "익명의 누군가",
    goalTitle: "목표",
  });
  assertEquals("data" in result, true);
  if ("data" in result) {
    assertEquals(result.data.phone, undefined);
    assertEquals(result.data.displayName, "익명의 누군가");
    assertEquals(result.data.goalTitle, "목표");
  }
});

Deno.test("validateNotifyInput — 타입별 필수 입력 누락을 거부한다", () => {
  const cheer = validateNotifyInput({
    memberId: "member-1",
    type: "CHEER_RECEIVED",
  });
  const paid = validateNotifyInput({
    memberId: "member-1",
    type: "CASHOUT_PAID",
  });

  assertEquals("error" in cheer, true);
  assertEquals("error" in paid, true);
});
