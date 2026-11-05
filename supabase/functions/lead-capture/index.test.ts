import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleLeadCapture } from "./index.ts";

Deno.test(
  "lead-capture HTTP method 오류는 code-only 오류를 반환한다",
  async () => {
    const response = await handleLeadCapture(
      new Request("https://f.test/lead-capture", { method: "GET" }),
    );

    assertEquals(response.status, 405);
    assertEquals(await response.json(), {
      error: { code: "method_not_allowed" },
    });
  },
);

Deno.test("lead-capture 입력 오류는 code-only 오류를 반환한다", async () => {
  const response = await handleLeadCapture(
    new Request("https://f.test/lead-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }),
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: { code: "contact_required" } });
});
