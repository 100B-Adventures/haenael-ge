import { describe, expect, it } from "vitest";
import {
  buildGlitchTipOptions,
  resolveMonitoringEnvironment,
} from "../config";
import {
  sanitizeMonitoringString,
  scrubMonitoringEvent,
} from "../privacy";

describe("GlitchTip monitoring contract", () => {
  it("QA-TC-245-GLITCHTIP-01 DSN이 비어 있으면 SDK를 완전히 끈다", () => {
    expect(buildGlitchTipOptions(undefined, "production").enabled).toBe(false);
    expect(buildGlitchTipOptions("   ", "production").enabled).toBe(false);
    expect(buildGlitchTipOptions("   ", "production").dsn).toBeUndefined();
  });

  it("QA-TC-245-GLITCHTIP-02 오류 전량·추적 0과 릴리스·환경 태그를 고정한다", () => {
    const options = buildGlitchTipOptions("https://public@example.invalid/1", "production");

    expect(options).toMatchObject({
      enabled: true,
      environment: "production",
      release: "haenael-ge@2.4.5",
      sampleRate: 1,
      tracesSampleRate: 0,
      autoSessionTracking: false,
      sendDefaultPii: false,
    });
    expect(resolveMonitoringEnvironment("preview")).toBe("preview");
    expect(resolveMonitoringEnvironment(undefined)).toBe("preview");
  });

  it("QA-TC-245-GLITCHTIP-03 전화·이메일·토큰·쿼리와 민감 필드를 제거한다", () => {
    const event = scrubMonitoringEvent({
      message: "test@example.com 010-1234-5678 Bearer abc.def.ghi",
      request: {
        url: "https://example.invalid/path?token=secret&email=test@example.com",
        headers: { authorization: "Bearer secret" },
        data: { access_token: "secret", safe: "kept" },
      },
      user: { email: "test@example.com" },
      extra: { safe: "kept" },
    });

    expect(event).toEqual({
      message: "[email-redacted] [phone-redacted] Bearer [token-redacted]",
      request: {
        url: "https://example.invalid/path",
        data: { safe: "kept" },
      },
      extra: { safe: "kept" },
    });
    expect(sanitizeMonitoringString("token eyJhbGciOiJIUzI1NiJ9.abcdefghijk.abcdefghijk"))
      .not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });
});
