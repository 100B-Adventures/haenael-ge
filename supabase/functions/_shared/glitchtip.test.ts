import {
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildEdgeGlitchTipOptions,
  resolveEdgeMonitoringEnvironment,
  scrubEdgeMonitoringEvent,
  shouldReportEdgeResponse,
} from "./glitchtip.ts";

Deno.test("QA-TC-245-EDGE-01 DSN이 없으면 Edge SDK가 꺼진다", () => {
  assertFalse(buildEdgeGlitchTipOptions(undefined, "production").enabled);
  assertFalse(buildEdgeGlitchTipOptions("   ", "production").enabled);
});

Deno.test("QA-TC-245-EDGE-02 환경·릴리스·표본 비율을 고정한다", () => {
  const options = buildEdgeGlitchTipOptions(
    "https://public@example.invalid/1",
    "production",
  );
  assertEquals(options.environment, "production");
  assertEquals(options.release, "haenael-ge@2.4.5");
  assertEquals(options.sampleRate, 1);
  assertEquals(options.tracesSampleRate, 0);
  assertEquals(resolveEdgeMonitoringEnvironment("preview"), "preview");
});

Deno.test("QA-TC-245-EDGE-03 PII 제거와 5xx 전용 보고를 지킨다", () => {
  assertEquals(
    scrubEdgeMonitoringEvent({
      message: "test@example.com 010-1234-5678 Bearer abc.def.ghi",
      authorization: "secret",
      extra: { safe: "kept", refresh_token: "secret" },
    } as unknown),
    {
      message: "[email-redacted] [phone-redacted] Bearer [token-redacted]",
      extra: { safe: "kept" },
    },
  );
  assertFalse(shouldReportEdgeResponse(499));
  assertEquals(shouldReportEdgeResponse(500), true);
});
