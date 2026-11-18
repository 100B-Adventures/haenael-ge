import { assertEquals } from "jsr:@std/assert@1";
import { handleGoogleExternalReport } from "../_shared/google-external-report.ts";

const row = {
  purchase_id: 7,
  external_transaction_token_enc: "\\x00",
  external_transaction_id: "order-0007",
  transaction_time: "2026-11-18T10:00:00Z",
  pretax_amount_minor: 1000,
  tax_amount_minor: 100,
  user_tax_region: "KR",
  attempt_count: 1,
};

Deno.test("TC-APP-02-10 Google 외부 거래 보고 worker는 내부 인증을 강제한다", async () => {
  const response = await handleGoogleExternalReport(
    new Request("http://local", { method: "POST" }),
    { internalToken: "secret", claim: async () => [], report: async () => {}, settle: async () => {} },
  );
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-02-11 Google 외부 거래 성공은 REPORTED 정산으로 끝낸다", async () => {
  const settled: unknown[] = [];
  const response = await handleGoogleExternalReport(
    new Request("http://local", {
      method: "POST",
      headers: { "x-google-report-internal-token": "secret" },
    }),
    {
      internalToken: "secret",
      claim: async () => [row],
      report: async () => {},
      settle: async (input) => { settled.push(input); },
    },
  );
  assertEquals(response.status, 200);
  assertEquals(settled, [{ purchaseId: 7, success: true, permanent: false, errorCode: null }]);
});

Deno.test("TC-APP-02-12 잘못된 Google 보고 payload는 영구 실패로 격리한다", async () => {
  const settled: unknown[] = [];
  const failure = new Error("google_external_report_http_400") as Error & { status: number };
  failure.status = 400;
  const response = await handleGoogleExternalReport(
    new Request("http://local", {
      method: "POST",
      headers: { "x-google-report-internal-token": "secret" },
    }),
    {
      internalToken: "secret",
      claim: async () => [row],
      report: async () => { throw failure; },
      settle: async (input) => { settled.push(input); },
    },
  );
  assertEquals(response.status, 207);
  assertEquals(settled, [{
    purchaseId: 7,
    success: false,
    permanent: true,
    errorCode: "google_external_report_http_400",
  }]);
});
