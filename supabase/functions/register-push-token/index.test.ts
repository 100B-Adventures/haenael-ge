import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { handleRegisterPushToken, parsePushTokenRequest } from "./index.ts";

Deno.test("TC-APP-05-6 인증 없는 푸시 토큰 쓰기는 거절한다", async () => {
  const response = await handleRegisterPushToken(
    new Request("http://local", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-05-7 Expo 푸시 토큰과 기기 식별자를 검증한다", () => {
  assertEquals(
    parsePushTokenRequest({
      platform: "IOS",
      expo_push_token: "ExponentPushToken[abcdefghijklmnopqrstuv]",
      device_id: "device-ios-0001",
      request_key: "push-request-0001",
    }).platform,
    "IOS",
  );
});

Deno.test("TC-APP-05-8 회원 ID를 요청으로 받지 않고 잘못된 Expo 토큰을 거절한다", () => {
  assertThrows(
    () =>
      parsePushTokenRequest({
        platform: "ANDROID",
        expo_push_token: "raw-fcm-token",
        device_id: "device-android-0001",
        request_key: "push-request-0002",
        member_id: "00000000-0000-0000-0000-000000000119",
      }),
    Error,
    "invalid_push_token",
  );
});

Deno.test("TC-APP-09-7 Auth 삭제 뒤 푸시 토큰 DELETE는 멱등 성공한다", async () => {
  const previousUrl = Deno.env.get("SUPABASE_URL");
  const previousKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const previousFetch = globalThis.fetch;
  Deno.env.set("SUPABASE_URL", "http://supabase.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-fixture");
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ message: "User not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
  try {
    const response = await handleRegisterPushToken(
      new Request("http://local", {
        method: "DELETE",
        headers: { Authorization: "Bearer deleted-user-token" },
        body: JSON.stringify({
          device_id: "device-delete-0001",
          request_key: "push-delete-0001",
        }),
      }),
    );
    assertEquals(response.status, 200);
    assertEquals(await response.json(), {
      data: { deleted: true, already_deleted: true },
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) Deno.env.delete("SUPABASE_URL");
    else Deno.env.set("SUPABASE_URL", previousUrl);
    if (previousKey === undefined) Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    else Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", previousKey);
  }
});
