import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  handleRegisterAppleRevocationToken,
  parseAppleRevocationToken,
} from "./index.ts";

Deno.test("TC-APP-09-9 Apple 폐기 토큰은 요청 필드 하나만 받는다", () => {
  assertEquals(
    parseAppleRevocationToken({
      provider_refresh_token: "apple-refresh-token-value",
    }),
    "apple-refresh-token-value",
  );
  assertThrows(
    () => parseAppleRevocationToken({ provider_refresh_token: "short" }),
    Error,
    "invalid_token",
  );
});

Deno.test("TC-APP-09-10 인증 없는 Apple 토큰 등록은 암호화 전에 거절한다", async () => {
  const response = await handleRegisterAppleRevocationToken(
    new Request("http://local", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});
