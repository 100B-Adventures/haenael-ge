import { assertEquals } from "jsr:@std/assert@1";
import { handleAuthToss } from "./index.ts";

Deno.test("TC-TOSS-01-3 동의 거부·잘못된 코드는 안정 오류로 닫힌다", async () => {
  const response = await handleAuthToss(new Request("http://local/functions/v1/auth-toss", {
    method: "POST",
    body: JSON.stringify({ authorization_code: "", referrer: "SANDBOX" }),
  }));
  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: { code: "invalid_toss_authorization" } });
});
