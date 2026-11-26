import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  AnalyticsConsentProvider,
  useAnalyticsConsentState,
} from "../AnalyticsConsentProvider";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics/consent";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  readMaybeSingle: vi.fn(),
  updateMaybeSingle: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: supabaseMocks.getUser,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: supabaseMocks.unsubscribe } } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: supabaseMocks.readMaybeSingle }) }),
      update: () => ({
        eq: () => ({ select: () => ({ maybeSingle: supabaseMocks.updateMaybeSingle }) }),
      }),
    }),
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  supabaseMocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  supabaseMocks.readMaybeSingle.mockResolvedValue({ data: { analytics_consent: null }, error: null });
  supabaseMocks.updateMaybeSingle.mockResolvedValue({ data: { analytics_consent: "denied" }, error: null });
});

it("동의 상태는 브라우저에 저장하고 다시 읽는다", () => {
  setAnalyticsConsent("granted");
  expect(getAnalyticsConsent()).toBe("granted");
});

it("AN-CONSENT-UNIT-08 Provider 한 곳에서 여러 소비자의 계정 동의를 한 번만 조회한다", async () => {
  supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: "member-1" } }, error: null });
  supabaseMocks.readMaybeSingle.mockResolvedValue({ data: { analytics_consent: "denied" }, error: null });
  const Probe = () => {
    const { consent } = useAnalyticsConsentState();
    return <span>{consent ?? "none"}</span>;
  };

  render(<AnalyticsConsentProvider><Probe /><Probe /></AnalyticsConsentProvider>);

  expect(await screen.findAllByText("denied")).toHaveLength(2);
  expect(supabaseMocks.getUser).toHaveBeenCalledTimes(1);
  expect(supabaseMocks.readMaybeSingle).toHaveBeenCalledTimes(1);
});
