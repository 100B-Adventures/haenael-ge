import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type CheerNotificationDeps,
  dispatchCheerReceivedNotification,
} from "./cheer-notification.ts";

const input = {
  memberId: "aaaaaaaa-0000-0000-0000-000000000001",
  displayName: "익명의 누군가",
  goalTitle: "편입 평점 4.0 해낼게",
};

Deno.test("전화번호 없음 — notify를 호출하지 않고 기존 INAPP으로 강등", async () => {
  let invokeCount = 0;
  const deps: CheerNotificationDeps = {
    getMemberPhone: () => Promise.resolve({ phone: null }),
    invokeNotify: () => {
      invokeCount += 1;
      return Promise.resolve({ data: { channel: "ALIMTALK" } });
    },
  };

  const result = await dispatchCheerReceivedNotification(deps, input);

  assertEquals(result, { channel: "INAPP", reason: "phone_missing" });
  assertEquals(invokeCount, 0);
});

Deno.test("전화번호 있음 — notify에 개인정보 최소 payload만 전달", async () => {
  let captured: Record<string, unknown> | undefined;
  const deps: CheerNotificationDeps = {
    getMemberPhone: () => Promise.resolve({ phone: "01012345678" }),
    invokeNotify: (payload) => {
      captured = payload;
      return Promise.resolve({ data: { channel: "ALIMTALK" } });
    },
  };

  const result = await dispatchCheerReceivedNotification(deps, input);

  assertEquals(result, { channel: "ALIMTALK" });
  assertObjectMatch(captured ?? {}, {
    memberId: input.memberId,
    type: "CHEER_RECEIVED",
    phone: "01012345678",
    displayName: input.displayName,
    goalTitle: input.goalTitle,
  });
  assertEquals("amount" in (captured ?? {}), false);
  assertEquals("cloverAmount" in (captured ?? {}), false);
});

Deno.test("전화번호 조회 실패 — 결제와 분리해 INAPP으로 강등", async () => {
  const result = await dispatchCheerReceivedNotification({
    getMemberPhone: () =>
      Promise.resolve({ phone: null, error: "db unavailable" }),
    invokeNotify: () => Promise.reject(new Error("호출되면 안 됨")),
  }, input);

  assertEquals(result, { channel: "INAPP", reason: "phone_lookup_failed" });
});

Deno.test("notify 실패/환경변수 미설정 응답 — 결제와 분리해 INAPP으로 강등", async () => {
  const invokeError = await dispatchCheerReceivedNotification({
    getMemberPhone: () => Promise.resolve({ phone: "01012345678" }),
    invokeNotify: () => Promise.resolve({ error: "FunctionsHttpError" }),
  }, input);
  const fallbackResponse = await dispatchCheerReceivedNotification({
    getMemberPhone: () => Promise.resolve({ phone: "01012345678" }),
    invokeNotify: () => Promise.resolve({ data: { channel: "INAPP" } }),
  }, input);

  assertEquals(invokeError, { channel: "INAPP", reason: "notify_failed" });
  assertEquals(fallbackResponse, { channel: "INAPP", reason: "notify_failed" });
});
