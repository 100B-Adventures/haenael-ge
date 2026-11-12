import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initGA,
  isSensitiveAnalyticsPath,
  sanitizePagePath,
  trackPageView,
  trackEvent,
} from "@/lib/analytics";
import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";

beforeEach(() => {
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
  delete window.gtag;
  delete window.dataLayer;
  delete window.haenaelGtagPending;
  delete window.haenaelGtagMeasurementId;
});

describe("GA4 page path privacy", () => {
  it("removes query parameters and fragments", () => {
    expect(sanitizePagePath("/payment/success?paymentKey=secret&orderId=order#done"))
      .toBe("/payment/success");
  });

  it("결제·초대 경로는 page_view 자체를 보내지 않는다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackPageView("/payment/success?paymentKey=secret");
    trackPageView("/invite/private-token");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("분석 동의 전에는 일반 경로 event도 보내거나 queue하지 않는다", () => {
    window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    window.gtag = undefined;
    window.dataLayer = undefined;

    expect(trackEvent("goal_created")).toBe(false);
    expect(window.dataLayer).toBeUndefined();
  });

  it("민감 경로 판정은 하위 경로만 막고 유사 접두어는 허용한다", () => {
    expect(isSensitiveAnalyticsPath("/payment/success?paymentKey=secret")).toBe(true);
    expect(isSensitiveAnalyticsPath("/invite/private-token")).toBe(true);
    expect(isSensitiveAnalyticsPath("/payments-guide")).toBe(false);
  });
});

describe("trackEvent — 5차 라운드 신규 배선 이벤트", () => {
  it("goal_created 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.haenaelGtagMeasurementId = "G-TEST123";
    trackEvent("goal_created", { source: "onboarding" });
    expect(gtag).toHaveBeenCalledWith("event", "goal_created", { source: "onboarding" });
  });

  it("share_link_copied 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.haenaelGtagMeasurementId = "G-TEST123";
    trackEvent("share_link_copied", { source: "share_link_card" });
    expect(gtag).toHaveBeenCalledWith("event", "share_link_copied", { source: "share_link_card" });
  });

  it("wordmap_viewed 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.haenaelGtagMeasurementId = "G-TEST123";
    trackEvent("wordmap_viewed", { goal_id: "1" });
    expect(gtag).toHaveBeenCalledWith("event", "wordmap_viewed", { goal_id: "1" });
  });

  it("wordmap_shared 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.haenaelGtagMeasurementId = "G-TEST123";
    trackEvent("wordmap_shared", { method: "link", goal_id: "1" });
    expect(gtag).toHaveBeenCalledWith("event", "wordmap_shared", { method: "link", goal_id: "1" });
  });

  it("gtag 미초기화 이벤트를 config 뒤에 전달한다", () => {
    trackEvent("goal_created", { source: "onboarding" });
    expect(window.dataLayer).toBeUndefined();

    initGA("G-TEST123");

    const calls = window.dataLayer!.map((entry) => Array.from(entry as IArguments));
    expect(calls.map((call) => call[0])).toEqual(["js", "consent", "config", "event"]);
    expect(calls[2]).toEqual(["config", "G-TEST123", {
      send_page_view: false,
      cookie_domain: "localhost",
    }]);
    expect(calls[3]).toEqual(["event", "goal_created", { source: "onboarding" }]);
  });

  it("gtag 미초기화 page_view도 config 뒤에 전달한다", () => {
    trackPageView("/g/slug?x=1");
    initGA("G-TEST123");
    const pushed = window.dataLayer![3] as IArguments;
    expect(Array.from(pushed)).toEqual(["event", "page_view", { page_path: "/g/slug" }]);
  });

  it.each([
    ["wordmap_viewed", { goal_id: "1" }],
    ["wordmap_shared", { method: "link", goal_id: "1" }],
    ["cashout_initiated", { clover_amount: 100, status: "REQUESTED" }],
    ["sign_up", { method: "oauth" }],
    ["login", { method: "oauth" }],
  ] as const)("%s 이벤트를 초기화된 gtag로 보낸다", (event, params) => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window.haenaelGtagMeasurementId = "G-TEST123";

    trackEvent(event, params);

    expect(gtag).toHaveBeenCalledWith("event", event, params);
  });
});
