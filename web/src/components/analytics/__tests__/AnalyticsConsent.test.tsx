import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AnalyticsConsentBanner } from "../AnalyticsConsentBanner";
import {
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: supabaseMocks.getUser,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: supabaseMocks.unsubscribe } } }),
    },
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  supabaseMocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
});

it("선택 전에는 분석 정보 국외 이전 별도 동의와 거부 선택지를 보여준다", async () => {
  render(<AnalyticsConsentBanner />);

  expect(await screen.findByTestId("analytics-consent-banner")).toHaveClass("receiver-analytics-consent-banner");
  expect(screen.getByRole("button", { name: "분석 정보 국외 이전에 동의" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "분석 정보 국외 이전에 동의하지 않음" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "상세" })).toHaveAttribute("href", "/privacy#analytics-overseas");
});

it("거부 선택을 저장하고 banner를 닫는다", async () => {
  render(<AnalyticsConsentBanner />);
  fireEvent.click(await screen.findByRole("button", { name: "분석 정보 국외 이전에 동의하지 않음" }));

  await waitFor(() => expect(screen.queryByTestId("analytics-consent-banner")).toBeNull());
  expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
});

it("동의 상태는 브라우저에 저장하고 다시 읽는다", () => {
  setAnalyticsConsent("granted");
  expect(getAnalyticsConsent()).toBe("granted");
});
