// notify — Deno 단위 테스트
// 실 Supabase 연동 없이 입력 검증·로직만 테스트.
// 알림톡 실발송 = ⛔ (카카오 비즈채널 셋업 필요)

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCheerReceivedMessage,
  sendAlimtalk,
  TEMPLATE_CODES,
} from "../_shared/alimtalk.ts";
import { authorizeNotifyRequest } from "../_shared/notify-auth.ts";
import {
  buildCashoutRequestedSlackAlert,
  buildNotifyMessage,
  validateNotifyInput,
} from "../_shared/notify-message.ts";

const cashoutRequestedInput = {
  memberId: "member-1",
  type: "CASHOUT_REQUESTED" as const,
  cashoutRequestId: 71,
  cloverAmount: 30,
  netKrw: 25_819,
  requestedAt: "2026-08-25T09:10:00.000Z",
  adminUrl: "https://haenael.app/admin",
};

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
    cashoutRequestedInput,
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
    ...cashoutRequestedInput,
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

Deno.test("ALT-AUTH-01 내부 공유 토큰은 허용하고 일반 로그인 사용자 토큰은 거부한다", async () => {
  const internalToken = "n".repeat(48);
  const allowed = await authorizeNotifyRequest(internalToken, internalToken);
  const userJwtOnly = await authorizeNotifyRequest(null, internalToken);
  const wrongToken = await authorizeNotifyRequest(
    "u".repeat(48),
    internalToken,
  );

  assertEquals(allowed, { ok: true });
  assertEquals(userJwtOnly, {
    ok: false,
    status: 401,
    code: "unauthorized",
    message: "Internal notify token required",
  });
  assertEquals(wrongToken, {
    ok: false,
    status: 403,
    code: "forbidden",
    message: "Internal notify token required",
  });
});

Deno.test("ALT-AUTH-02 내부 공유 토큰 미설정은 fail-closed로 거부한다", async () => {
  const result = await authorizeNotifyRequest("n".repeat(48), "short");
  assertEquals(result, {
    ok: false,
    status: 503,
    code: "missing_notify_internal_token",
    message: "Notify internal token missing",
  });
});

Deno.test("ALT-SLACK-01 환전 신청 관리자 통지는 필수 5필드만 포함하고 민감정보를 제외한다", () => {
  const validated = validateNotifyInput({
    ...cashoutRequestedInput,
    accountNo: "123456789012",
    residentRegistrationNumber: "900101-1234567",
  });
  assertEquals("data" in validated, true);
  if ("error" in validated) return;

  const alert = buildCashoutRequestedSlackAlert(validated.data);
  assertEquals(alert.fields, {
    "신청 ID": 71,
    "클로버 수": "30개",
    "입금 예정액": "25,819원",
    "신청 시각": "2026-08-25T09:10:00.000Z",
    "관리자 화면": "https://haenael.app/admin",
  });
  const serialized = JSON.stringify(alert);
  assertEquals(serialized.includes("123456789012"), false);
  assertEquals(serialized.includes("900101-1234567"), false);
  assertEquals(serialized.includes("accountNo"), false);
});
