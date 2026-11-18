import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  handlePrepareAlternativeCheckout,
  parseCheckoutPreparation,
} from "./index.ts";

Deno.test("TC-APP-02-13 체크아웃 준비는 금액·상품을 클라이언트에서 받지 않는다", () => {
  const parsed = parseCheckoutPreparation({
    intent_id: "00000000-0000-0000-0000-000000000111",
    account_binding: "00000000-0000-0000-0000-000000000112",
    request_key: "request-key-0001",
    return_url: "haenael://payment/alternative-return",
    amount: 1,
    product_id: "attacker-product",
  });
  assertEquals(Object.hasOwn(parsed, "amount"), false);
  assertEquals(Object.hasOwn(parsed, "productId"), false);
});

Deno.test("TC-APP-02-14 앱 딥링크가 아닌 return URL은 거절한다", () => {
  assertThrows(
    () =>
      parseCheckoutPreparation({
        intent_id: "00000000-0000-0000-0000-000000000111",
        account_binding: "00000000-0000-0000-0000-000000000112",
        request_key: "request-key-0001",
        return_url: "https://attacker.example/capture",
      }),
    Error,
    "invalid_request",
  );
});

Deno.test("TC-APP-02-14-1 Expo의 세 슬래시 앱 딥링크도 허용한다", () => {
  assertEquals(
    parseCheckoutPreparation({
      intent_id: "00000000-0000-0000-0000-000000000111",
      account_binding: "00000000-0000-0000-0000-000000000112",
      request_key: "request-key-0001",
      return_url: "haenael:///payment/alternative-return",
    }).returnUrl,
    "haenael:///payment/alternative-return",
  );
});

Deno.test("TC-APP-02-15 인증 없는 체크아웃 준비는 DB 전에 거절한다", async () => {
  const response = await handlePrepareAlternativeCheckout(
    new Request("http://local", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});
