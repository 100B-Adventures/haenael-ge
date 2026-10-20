import { assertEquals } from "jsr:@std/assert@1";
import { authorizeCleanupRequest } from "./cleanup-auth.ts";

const expected = "x".repeat(48);

Deno.test("EA-03 내부 토큰 누락은 401이고 claim 전에 거부한다", async () => {
  assertEquals(await authorizeCleanupRequest(null, expected), {
    ok: false,
    status: 401,
    code: "auth_required",
  });
});

Deno.test("EA-04 같은 길이와 다른 길이의 오토큰은 모두 403이다", async () => {
  const sameLength = await authorizeCleanupRequest("y".repeat(48), expected);
  const short = await authorizeCleanupRequest("short-wrong", expected);
  assertEquals(sameLength.ok ? null : sameLength.status, 403);
  assertEquals(short.ok ? null : short.status, 403);
});

Deno.test("EA-04 기대 토큰 누락 또는 32자 미만은 fail-closed 503이다", async () => {
  const missing = await authorizeCleanupRequest(expected, undefined);
  const tooShort = await authorizeCleanupRequest(expected, "z".repeat(31));
  assertEquals(missing.ok ? null : missing.status, 503);
  assertEquals(tooShort.ok ? null : tooShort.status, 503);
});

Deno.test("EA-01 올바른 내부 토큰은 허용한다", async () => {
  assertEquals(await authorizeCleanupRequest(expected, expected), { ok: true });
});
