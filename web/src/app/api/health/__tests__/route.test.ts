import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

describe("GET /api/health", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalVercelSourceSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const originalInjectedSourceSha = process.env.DEPLOY_SOURCE_SHA;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    if (originalVercelSourceSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = originalVercelSourceSha;
    if (originalInjectedSourceSha === undefined) delete process.env.DEPLOY_SOURCE_SHA;
    else process.env.DEPLOY_SOURCE_SHA = originalInjectedSourceSha;
    vi.unstubAllGlobals();
  });

  it("HEALTH-01 공개 URL의 Supabase project ref를 staging guard용으로 반환한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      status: "ok",
      database: "ok",
      supabaseProjectRef: "project-ref",
    }));
  });

  it("HEALTH-02 Supabase URL이 없으면 ref를 null로 두고 degraded를 반환한다", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(expect.objectContaining({
      status: "degraded",
      supabaseProjectRef: null,
    }));
  });

  it("HEALTH-03 명시적으로 주입한 SHA가 오래된 Vercel Git SHA보다 우선한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.VERCEL_GIT_COMMIT_SHA = "0123456789abcdef";
    process.env.DEPLOY_SOURCE_SHA = "fedcba9876543210";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));

    const response = await GET();

    expect(await response.json()).toEqual(expect.objectContaining({
      sourceSha: "fedcba9876543210",
    }));
  });

  it("HEALTH-04 주입 SHA가 없으면 Vercel Git SHA를 반환한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.VERCEL_GIT_COMMIT_SHA = "0123456789abcdef";
    delete process.env.DEPLOY_SOURCE_SHA;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));

    const response = await GET();

    expect(await response.json()).toEqual(expect.objectContaining({
      sourceSha: "0123456789abcdef",
    }));
  });

  it("HEALTH-05 두 SHA가 모두 없으면 기존 API 계약대로 null을 반환한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.DEPLOY_SOURCE_SHA;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));

    const response = await GET();

    expect(await response.json()).toEqual(expect.objectContaining({ sourceSha: null }));
  });

  it("HEALTH-06 주입 SHA가 공백뿐이면 공백을 제거한 Vercel Git SHA를 반환한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.VERCEL_GIT_COMMIT_SHA = "  0123456789abcdef\n";
    process.env.DEPLOY_SOURCE_SHA = " \t ";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));

    const response = await GET();

    expect(await response.json()).toEqual(expect.objectContaining({
      sourceSha: "0123456789abcdef",
    }));
  });

  it("HEALTH-07 주입 SHA의 바깥 공백을 제거하고 Vercel Git SHA보다 우선한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.VERCEL_GIT_COMMIT_SHA = " 0123456789abcdef ";
    process.env.DEPLOY_SOURCE_SHA = "  fedcba9876543210\n";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));

    const response = await GET();

    expect(await response.json()).toEqual(expect.objectContaining({
      sourceSha: "fedcba9876543210",
    }));
  });

  it("HEALTH-08 두 SHA가 모두 빈 문자열 또는 공백이면 null을 반환한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    process.env.VERCEL_GIT_COMMIT_SHA = "";
    process.env.DEPLOY_SOURCE_SHA = " \t\n ";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("[]", { status: 200 })));

    const response = await GET();

    expect(await response.json()).toEqual(expect.objectContaining({ sourceSha: null }));
  });
});
