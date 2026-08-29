import { describe, expect, it } from "vitest";
import nextConfig, {
  buildContentSecurityPolicy,
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
} from "../../next.config";

describe("SEC-HEADERS 응답 보안 헤더 계약", () => {
  it("SEC-HEADERS-01 정상: 모든 경로에 필수 브라우저 방어 헤더를 적용한다", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toHaveLength(1);
    expect(rules?.[0]).toMatchObject({ source: "/(.*)" });

    const headers = Object.fromEntries(
      SECURITY_HEADERS.map(({ key, value }) => [key, value]),
    );
    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    });
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("SEC-HEADERS-02 거절: 실행 코드·프레임·객체를 전역 와일드카드로 열지 않는다", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/(?:default|script|frame)-src[^;]*\s\*/);
  });

  it("SEC-HEADERS-03 연동: 실제 사용 중인 Supabase·Toss·GA4만 허용한다", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("https://*.supabase.co");
    expect(CONTENT_SECURITY_POLICY).toContain("wss://*.supabase.co");
    expect(CONTENT_SECURITY_POLICY).toContain("https://js.tosspayments.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://*.tosspayments.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://www.googletagmanager.com");
    expect(CONTENT_SECURITY_POLICY).not.toContain("vercel-insights.com");
  });

  it("SEC-HEADERS-04 환경 분리: 로컬 Supabase는 개발에서만 허용한다", () => {
    const developmentPolicy = buildContentSecurityPolicy(true);
    const productionPolicy = buildContentSecurityPolicy(false);

    expect(developmentPolicy).toContain("http://127.0.0.1:54321");
    expect(developmentPolicy).toContain("ws://localhost:54321");
    expect(productionPolicy).not.toContain("127.0.0.1:54321");
    expect(productionPolicy).not.toContain("localhost:54321");
  });
});
