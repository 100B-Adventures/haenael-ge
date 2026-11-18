import { assertEquals } from "jsr:@std/assert@1";
import { handleVerifyStorePurchase, tossIapEnvironment } from "./index.ts";

Deno.test("TC-APP-01-3 인증 없는 영수증 검증은 DB 쓰기 전에 거절한다", async () => {
  const response = await handleVerifyStorePurchase(new Request("http://local/functions/v1/verify-store-purchase", {
    method: "POST",
    body: JSON.stringify({}),
  }));
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-01-3 잘못된 구매 요청은 안정 오류로 거절한다", async () => {
  const response = await handleVerifyStorePurchase(new Request("http://local/functions/v1/verify-store-purchase", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify({ provider: "APPLE" }),
  }));
  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: { code: "invalid_request" } });
});

Deno.test("TC-TOSS-04-3 앱인토스 SDK 3.x 주문은 샌드박스로 위장하지 않는다", () => {
  assertEquals(tossIapEnvironment(), "PRODUCTION");
});
