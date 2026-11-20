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

  it("SEC-HEADERS-07 연동: 카카오톡 공유 SDK 의 템플릿 검증 요청(kapi.kakao.com)을 connect-src 에 허용한다", () => {
    // 2026-11-20 운영 사고: connect-src 에 kapi.kakao.com 이 없어 Kakao.Share.sendDefault 가
    // KAPIError 로 실패하고 카카오 공유창이 "요청 실패"를 띄웠다.
    const connectSrc = CONTENT_SECURITY_POLICY.split(";").map((d) => d.trim())
      .find((d) => d.startsWith("connect-src")) ?? "";
    expect(connectSrc).toContain("https://kapi.kakao.com");
    expect(CONTENT_SECURITY_POLICY).toContain("https://t1.kakaocdn.net");
  });

  it("SEC-HEADERS-08 연동: 카카오톡 공유창으로 가는 form POST 와 로그인 리다이렉트를 form-action 에 허용한다", () => {
    // 2026-11-21 staging 실측: kapi 를 열어도 SDK 의 sharer.kakao.com/picker/link form POST 가
    // form-action 에 막혀 공유창이 안 열렸다. 카카오 미로그인이면 accounts.kakao.com 으로 넘어간다.
    const formAction = CONTENT_SECURITY_POLICY.split(";").map((d) => d.trim())
      .find((d) => d.startsWith("form-action")) ?? "";
    expect(formAction).toContain("https://sharer.kakao.com");
    expect(formAction).toContain("https://accounts.kakao.com");
    expect(formAction).not.toContain("https://*.kakao.com");
  });

  it("SEC-HEADERS-04 환경 분리: 로컬 Supabase는 개발에서만 허용한다", () => {
    const developmentPolicy = buildContentSecurityPolicy(true, undefined);
    const productionPolicy = buildContentSecurityPolicy(
      false,
      "https://project.supabase.co",
    );

    expect(developmentPolicy).toContain("http://127.0.0.1:54321");
    expect(developmentPolicy).toContain("ws://localhost:54321");
    expect(productionPolicy).not.toContain("127.0.0.1:54321");
    expect(productionPolicy).not.toContain("localhost:54321");
  });

  it("QA-V2-QA-01 정상: production-mode 로컬 QA는 설정된 loopback Supabase만 허용한다", () => {
    const policy = buildContentSecurityPolicy(
      false,
      "http://127.0.0.1:54321",
    );

    expect(policy).toContain("http://127.0.0.1:54321");
    expect(policy).toContain("ws://127.0.0.1:54321");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("QA-V2-QA-01 거절: loopback처럼 보이는 외부 origin은 production CSP에 추가하지 않는다", () => {
    const policy = buildContentSecurityPolicy(
      false,
      "https://127.0.0.1.attacker.example",
    );

    expect(policy).not.toContain("127.0.0.1.attacker.example");
  });
});
