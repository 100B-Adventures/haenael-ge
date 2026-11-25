import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_KEY, setAnalyticsConsent } from "@/lib/analytics/consent";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  readMaybeSingle: vi.fn(),
  updateMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.readMaybeSingle }) }),
      update: () => ({
        eq: () => ({ select: () => ({ maybeSingle: mocks.updateMaybeSingle }) }),
      }),
    }),
  }),
}));

import {
  persistAnalyticsConsent,
  resolveAnalyticsConsentFromAccount,
} from "@/lib/analytics/account-consent";

describe("계정 분석 동의", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "member-1" } }, error: null });
  });

  it("AN-CONSENT-UNIT-01 계정 선택을 새 브라우저 저장소에 복원한다", async () => {
    mocks.readMaybeSingle.mockResolvedValue({ data: { analytics_consent: "denied" }, error: null });

    await expect(resolveAnalyticsConsentFromAccount()).resolves.toBe("denied");
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
  });

  it("AN-CONSENT-UNIT-02 계정 저장이 실패하면 브라우저에 동의를 기록하지 않는다", async () => {
    mocks.updateMaybeSingle.mockResolvedValue({ data: null, error: { message: "denied" } });

    await expect(persistAnalyticsConsent("granted")).rejects.toThrow("ACCOUNT_CONSENT_SAVE_FAILED");
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull();
  });

  it("AN-CONSENT-UNIT-03 계정 저장 확인 뒤 브라우저에도 같은 선택을 기록한다", async () => {
    mocks.updateMaybeSingle.mockResolvedValue({ data: { analytics_consent: "granted" }, error: null });

    await persistAnalyticsConsent("granted");
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
  });

  it("AN-CONSENT-UNIT-04 비로그인 세션 부재는 브라우저 선택을 막지 않는다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError" },
    });

    await persistAnalyticsConsent("denied");
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(mocks.updateMaybeSingle).not.toHaveBeenCalled();
  });

  it("AN-CONSENT-UNIT-05 계정 선택 전 다른 회원의 로컬 동의는 이관하지 않는다", async () => {
    setAnalyticsConsent("granted");
    mocks.readMaybeSingle.mockResolvedValue({ data: { analytics_consent: null }, error: null });

    await expect(resolveAnalyticsConsentFromAccount()).resolves.toBeNull();
    expect(mocks.updateMaybeSingle).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull();
  });

  it("AN-CONSENT-UNIT-06 로컬 거부만 선택 전 계정에 안전하게 이관한다", async () => {
    setAnalyticsConsent("denied");
    mocks.readMaybeSingle.mockResolvedValue({ data: { analytics_consent: null }, error: null });
    mocks.updateMaybeSingle.mockResolvedValue({ data: { analytics_consent: "denied" }, error: null });

    await expect(resolveAnalyticsConsentFromAccount()).resolves.toBe("denied");
    expect(mocks.updateMaybeSingle).toHaveBeenCalledTimes(1);
  });
});
