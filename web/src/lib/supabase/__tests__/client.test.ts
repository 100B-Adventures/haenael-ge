import { beforeEach, describe, expect, it, vi } from "vitest";

const { createBrowserClient } = vi.hoisted(() => ({
  createBrowserClient: vi.fn(() => ({ kind: "browser-client" })),
}));

vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

import { createClient } from "../client";

describe("browser Supabase request identity", () => {
  beforeEach(() => {
    createBrowserClient.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
  });

  it("OBS-DEPLOY-01 모든 브라우저 Supabase 요청에 앱 버전과 배포 식별자를 싣는다", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "2.4.0");
    vi.stubEnv("NEXT_PUBLIC_APP_DEPLOY", "0123456789abcdef");

    createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://project-ref.supabase.co",
      "public-anon-key",
      expect.objectContaining({
        global: {
          headers: {
            "x-app-version": "2.4.0",
            "x-app-deploy": "0123456789abcdef",
          },
        },
      }),
    );
  });

  it("OBS-DEPLOY-02 비어 있는 선택 메타데이터도 빈 헤더 대신 안전한 식별자를 쓴다", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", " ");
    vi.stubEnv("NEXT_PUBLIC_APP_DEPLOY", "");

    createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        global: {
          headers: {
            "x-app-version": "dev",
            "x-app-deploy": "local",
          },
        },
      }),
    );
  });
});
