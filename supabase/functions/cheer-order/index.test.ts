import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCheerOrder } from "./index.ts";

Deno.test(
  "결제가 비활성화되면 code-only 오류를 반환하고 외부 결제를 호출하지 않는다",
  async () => {
    Deno.env.set("PAYMENTS_ENABLED", "false");

    const response = await handleCheerOrder(
      new Request("https://f.test/cheer-order", { method: "POST" }),
    );

    assertEquals(response.status, 503);
    assertEquals(await response.json(), {
      error: { code: "payments_disabled" },
    });
  },
);

Deno.test("주문 요청 형식 오류는 code-only 오류를 반환한다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer test",
        "Content-Type": "application/json",
      },
      body: "not-json",
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: { code: "invalid_json" } });
});
