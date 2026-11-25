import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({
    "user-agent": "Mozilla/5.0 (iPhone) KAKAOTALK 11.4.2",
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import KakaoSessionPendingPage from "../page";

describe("KakaoSessionPendingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://haenael-ge.vercel.app");
  });

  it("KAKAO-PENDING-SSR-01: 서버 세션이 있으면 JavaScript 없이 원래 화면으로 보낸다", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await expect(KakaoSessionPendingPage({
      searchParams: Promise.resolve({ redirect: "/friends" }),
    })).rejects.toThrow("NEXT_REDIRECT:/friends");
    expect(redirectMock).toHaveBeenCalledWith("/friends");
  });

  it("KAKAO-PENDING-SSR-NEG-01: 세션이 없으면 서버가 외부 링크·기기 안내 prop을 만든다", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const element = await KakaoSessionPendingPage({
      searchParams: Promise.resolve({ redirect: "/onboarding" }),
    });

    expect(element.props.isKakaoInApp).toBe(true);
    expect(element.props.deviceInstruction).toContain("Safari로 열기");
    expect(element.props.externalUrl).toMatch(/^kakaotalk:\/\/web\/openExternal\?url=/);
    expect(element.props.fallbackUrl).toBe(
      "https://haenael-ge.vercel.app/auth/kakao/start?redirect=%2Fonboarding&external_browser=1",
    );
  });
});
