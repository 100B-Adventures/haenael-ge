import { assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCashoutRequest } from "./index.ts";

Deno.test("legacy cashout endpoint는 민감 body를 읽지 않고 Server Action 경로를 요구한다", async () => {
  const accountNo = "123456789012";
  const response = handleCashoutRequest(
    new Request("http://local.test/cashout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountNo, accountHolder: "홍길동" }),
    }),
  );

  assertEquals(response.status, 410);
  const body = await response.text();
  assertEquals(JSON.parse(body).error.code, "cashout_server_action_required");
  assertFalse(body.includes(accountNo));
});

Deno.test("legacy cashout endpoint의 CORS preflight는 body 처리 없이 끝난다", () => {
  const response = handleCashoutRequest(
    new Request("http://local.test/cashout", { method: "OPTIONS" }),
  );
  assertEquals(response.status, 204);
});
