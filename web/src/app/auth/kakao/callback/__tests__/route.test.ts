import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildOAuthState } from "@/lib/auth/kakao-state";

const mockClaim = vi.fn();
const mockVerifyOtp = vi.fn();
const mockMarkAuthConversion = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({ rpc: mockClaim }),
}));
vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerClient: () => ({
    auth: { verifyOtp: mockVerifyOtp },
  }),
}));
vi.mock("@/lib/auth/signup-mark", () => ({
  markAuthConversion: (...args: unknown[]) => mockMarkAuthConversion(...args),
}));

function callbackRequest(code = "one-time-kakao-code") {
  const nonce = "callback-test-nonce";
  const state = buildOAuthState(nonce, "/onboarding");
  return new NextRequest(
    `http://localhost:3000/auth/kakao/callback?code=${code}&state=${encodeURIComponent(state)}`,
    { headers: { cookie: `kakao_oauth_nonce=${nonce}` } },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.stubGlobal("crypto", {
    subtle: {
      digest: vi.fn(async () => new Uint8Array(32).fill(7).buffer),
    },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ hashed_token: "token-hash", type: "email" }),
    { status: 200, headers: { "content-type": "application/json" } },
  )));
  mockVerifyOtp.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
});

describe("GET /auth/kakao/callback", () => {
  it("KAKAO-CALLBACK-01: 첫 callback만 EF와 verifyOtp를 호출한다", async () => {
    mockClaim.mockResolvedValue({ data: true, error: null });
    const { GET } = await import("../route");

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe("http://localhost:3000/onboarding");
    expect(mockClaim).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
    expect(mockVerifyOtp).toHaveBeenCalledOnce();
  });

  it("KAKAO-CALLBACK-NEG-01: 같은 code의 동시 두 번째 요청은 세션 발급 없이 복귀한다", async () => {
    mockClaim
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    const { GET } = await import("../route");

    const responses = await Promise.all([
      GET(callbackRequest()),
      GET(callbackRequest()),
    ]);

    expect(responses.map((response) => response.headers.get("location"))).toEqual([
      "http://localhost:3000/onboarding",
      "http://localhost:3000/onboarding",
    ]);
    expect(mockClaim).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockVerifyOtp).toHaveBeenCalledTimes(1);
  });

  it("KAKAO-CALLBACK-NEG-02: claim 저장소 장애 시 EF를 호출하지 않고 실패를 격리한다", async () => {
    mockClaim.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });
    const { GET } = await import("../route");

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?auth_error=callback_claim_failed",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });
});
