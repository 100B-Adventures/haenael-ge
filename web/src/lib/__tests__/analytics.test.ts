import { describe, expect, it, vi } from "vitest";
import { sanitizePagePath, trackPageView, trackEvent } from "@/lib/analytics";

describe("GA4 page path privacy", () => {
  it("removes query parameters and fragments", () => {
    expect(sanitizePagePath("/payment/success?paymentKey=secret&orderId=order#done"))
      .toBe("/payment/success");
  });

  it("never sends query parameters to gtag", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackPageView("/payment/success?paymentKey=secret");
    expect(gtag).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/payment/success",
    });
  });
});

describe("trackEvent — 5차 라운드 신규 배선 이벤트", () => {
  it("goal_created 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackEvent("goal_created", { source: "onboarding" });
    expect(gtag).toHaveBeenCalledWith("event", "goal_created", { source: "onboarding" });
  });

  it("share_link_copied 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackEvent("share_link_copied", { source: "share_link_card" });
    expect(gtag).toHaveBeenCalledWith("event", "share_link_copied", { source: "share_link_card" });
  });

  it("wordmap_viewed 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackEvent("wordmap_viewed", { goal_id: "1" });
    expect(gtag).toHaveBeenCalledWith("event", "wordmap_viewed", { goal_id: "1" });
  });

  it("wordmap_shared 이벤트를 gtag로 전달한다", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackEvent("wordmap_shared", { method: "link", goal_id: "1" });
    expect(gtag).toHaveBeenCalledWith("event", "wordmap_shared", { method: "link", goal_id: "1" });
  });

  it("gtag 미초기화 시 dataLayer에 폴백 push(이벤트 유실 없음)", () => {
    window.gtag = undefined;
    window.dataLayer = undefined;
    trackEvent("goal_created", { source: "onboarding" });
    expect(window.dataLayer).toHaveLength(1);
    const pushed = window.dataLayer![0] as IArguments;
    expect(Array.from(pushed)).toEqual(["event", "goal_created", { source: "onboarding" }]);
  });

  it("gtag 미초기화 시 page_view도 dataLayer 폴백으로 push한다", () => {
    window.gtag = undefined;
    window.dataLayer = undefined;
    trackPageView("/g/slug?x=1");
    const pushed = window.dataLayer![0] as IArguments;
    expect(Array.from(pushed)).toEqual(["event", "page_view", { page_path: "/g/slug" }]);
  });
});
