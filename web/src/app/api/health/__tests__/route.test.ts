import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

describe("GET /api/health", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
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
});
