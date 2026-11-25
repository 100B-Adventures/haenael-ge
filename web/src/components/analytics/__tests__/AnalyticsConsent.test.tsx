import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AnalyticsConsentBanner } from "../AnalyticsConsentBanner";
import {
  AnalyticsConsentProvider,
  useAnalyticsConsentState,
} from "../AnalyticsConsentProvider";
import {
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";

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

function renderBanner() {
  return render(<AnalyticsConsentProvider><AnalyticsConsentBanner /></AnalyticsConsentProvider>);
}

it("AN-CONSENT-UNIT-07 비회원에게는 동의 배너를 표시하지 않는다", async () => {
  renderBanner();

  await waitFor(() => expect(supabaseMocks.getUser).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId("analytics-consent-banner")).toBeNull();
});

it("선택 전 로그인 회원에게만 분석 정보 국외 이전 별도 동의와 거부 선택지를 보여준다", async () => {
  supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: "member-1" } }, error: null });
  renderBanner();

  expect(await screen.findByTestId("analytics-consent-banner")).toHaveClass("receiver-analytics-consent-banner");
  expect(screen.getByRole("button", { name: "분석 정보 국외 이전에 동의" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "분석 정보 국외 이전에 동의하지 않음" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "상세" })).toHaveAttribute("href", "/privacy#analytics-overseas");
});

it("거부 선택을 저장하고 banner를 닫는다", async () => {
  supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: "member-1" } }, error: null });
  renderBanner();
  fireEvent.click(await screen.findByRole("button", { name: "분석 정보 국외 이전에 동의하지 않음" }));

  await waitFor(() => expect(screen.queryByTestId("analytics-consent-banner")).toBeNull());
  expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
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
