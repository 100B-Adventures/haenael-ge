// proxy.test.ts — canonical 도메인 리다이렉트 회귀 테스트
// 근본원인 회귀 방지: web-two-theta-bmil2ljwdg.vercel.app 등 non-canonical
// production 별칭에서 /auth/kakao/start 를 열면 canonical로 308 되어야
// nonce 쿠키가 canonical에 세팅되고 콜백(canonical)과 일치한다.

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { isProtectedRoute, proxy } from "../proxy";
import protectedRoutes from "../../../qa/contracts/protected-routes.json";

function req(host: string, path: string) {
  return new NextRequest(new URL(path, `https://${host}`));
}

describe("proxy — canonical 도메인 강제", () => {
  it("AU-04 보호 라우트 계약은 공개 초대 상세를 제외한다", () => {
    expect(protectedRoutes.notes["/invite"]).toContain("exact-only");
    expect(isProtectedRoute("/me")).toBe(true);
    expect(isProtectedRoute("/my/legal")).toBe(true);
    expect(isProtectedRoute("/invite")).toBe(true);
    expect(isProtectedRoute("/invite/public-token")).toBe(false);
    expect(isProtectedRoute("/g/public-goal")).toBe(false);
  });
  it("AU-05 Auth 환경이 끊겨도 보호 화면은 흰 500 대신 랜딩으로 degrade한다", async () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await proxy(req("localhost", "/me"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://localhost/?next=%2Fme");
    if (previousUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  });
  it("알려진 레거시 production 별칭 호스트는 canonical로 308 리다이렉트", async () => {
    const res = await proxy(req("web-two-theta-bmil2ljwdg.vercel.app", "/auth/kakao/start?redirect=/onboarding"));
    expect(res.status).toBe(308);
    const location = res.headers.get("location");
    expect(location).toBe("https://haenael-ge.vercel.app/auth/kakao/start?redirect=/onboarding");
  });

  it("haenaelge.vercel.app 레거시 별칭도 canonical로 308 리다이렉트", async () => {
    const res = await proxy(req("haenaelge.vercel.app", "/"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://haenael-ge.vercel.app/");
  });

  it("canonical 호스트 자체는 리다이렉트 없이 통과 (2xx, location 없음)", async () => {
    const res = await proxy(req("haenael-ge.vercel.app", "/auth/kakao/callback?code=abc&state=xyz"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("localhost는 리다이렉트 없이 통과 (로컬 개발 보존)", async () => {
    const res = await proxy(req("localhost", "/onboarding"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("127.0.0.1도 리다이렉트 없이 통과", async () => {
    const res = await proxy(req("127.0.0.1", "/"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("알려지지 않은 Vercel preview 해시 도메인은 통과 (preview 배포 파괴 방지)", async () => {
    const res = await proxy(req("web-abc123xyz-sjteam.vercel.app", "/onboarding"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("git-branch preview 도메인도 통과", async () => {
    const res = await proxy(req("web-git-feature-foo-sjteam.vercel.app", "/onboarding"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("query string까지 정확히 보존해 리다이렉트", async () => {
    const res = await proxy(req("haenaelge.vercel.app", "/g/my-goal?utm_source=kakao&x=1"));
    expect(res.headers.get("location")).toBe(
      "https://haenael-ge.vercel.app/g/my-goal?utm_source=kakao&x=1",
    );
  });
});
