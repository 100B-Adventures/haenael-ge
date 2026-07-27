// auth/logout/route.test.ts — vitest
// signOut 호출 여부 + 랜딩("/")으로 리다이렉트 여부를 검증한다.
// createServerClient(@supabase/ssr)를 모킹해 실제 Supabase 없이 라우트 로직만 단위테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const signOutMock = vi.fn().mockResolvedValue({ error: null });

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      signOut: signOutMock,
    },
  })),
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  signOutMock.mockClear();
});

describe("GET/POST /auth/logout", () => {
  it("POST: supabase.auth.signOut() 를 호출한다", async () => {
    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost:3000/auth/logout", {
      method: "POST",
    });

    await POST(request);

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("갭D(2026-07-20): signOut이 scope:'global'로 호출된다(전 기기 세션 무효화)", async () => {
    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost:3000/auth/logout", {
      method: "POST",
    });

    await POST(request);

    expect(signOutMock).toHaveBeenCalledWith({ scope: "global" });
  });

  it("POST: 랜딩(\"/\")으로 302 리다이렉트한다", async () => {
    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost:3000/auth/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(307); // NextResponse.redirect 기본 307
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("GET: 링크 fallback으로도 signOut + 리다이렉트 동작", async () => {
    const { GET } = await import("../route");
    const request = new NextRequest("http://localhost:3000/auth/logout", {
      method: "GET",
    });

    const response = await GET(request);

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("signOut 실패해도 랜딩으로 리다이렉트한다(dead-end 0 원칙)", async () => {
    signOutMock.mockResolvedValueOnce({ error: { message: "session not found" } });
    const { POST } = await import("../route");
    const request = new NextRequest("http://localhost:3000/auth/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
