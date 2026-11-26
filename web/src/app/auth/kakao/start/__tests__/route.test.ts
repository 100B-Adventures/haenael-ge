import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_REST_API_KEY", "test-client-id");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
});

describe("GET /auth/kakao/start", () => {
  it("KAKAO-START-01: KAKAOTALK UA는 OAuth 전에 외부 브라우저 안내 화면으로 보낸다", async () => {
    const { GET } = await import("../route");
    const response = await GET(new NextRequest(
      "http://localhost:3000/auth/kakao/start?redirect=%2Fonboarding",
      { headers: { "user-agent": "KAKAOTALK 11.4.2 iOS" } },
    ));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/kakao/external?redirect=%2Fonboarding",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("KAKAO-START-02: 외부 브라우저 표식이 있으면 기존 OAuth 흐름을 그대로 탄다", async () => {
    const { GET } = await import("../route");
    const response = await GET(new NextRequest(
      "http://localhost:3000/auth/kakao/start?redirect=%2Fonboarding&external_browser=1",
      { headers: { "user-agent": "KAKAOTALK 11.4.2 iOS" } },
    ));

    expect(response.headers.get("location")).toContain(
      "https://kauth.kakao.com/oauth/authorize",
    );
    expect(response.headers.get("set-cookie")).toContain("kakao_oauth_nonce=");
  });
});
