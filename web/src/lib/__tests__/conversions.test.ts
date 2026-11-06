import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  META_PIXEL_ID,
  SIGNUP_MARK_COOKIE,
  initializeMetaPixel,
  trackPurchaseConversion,
  trackSignUpConversion,
} from "@/lib/analytics/conversions";
import { markIfNewAccount } from "@/lib/auth/signup-mark";

describe("광고 전환 이벤트", () => {
  const fbq = vi.fn();
  const gtag = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    window.fbq = fbq;
    window.gtag = gtag as typeof window.gtag;
  });

  afterEach(() => {
    delete window.fbq;
    delete window.gtag;
    vi.unstubAllEnvs();
    document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]')
      .forEach((script) => script.remove());
  });

  it("Purchase 는 주문번호별로 한 번만, 금액과 KRW 를 함께 보낸다", () => {
    trackPurchaseConversion("order-1", 3000);
    trackPurchaseConversion("order-1", 3000);

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "Purchase", { value: 3000, currency: "KRW" });
    expect(gtag).toHaveBeenCalledWith("event", "purchase", {
      transaction_id: "order-1",
      value: 3000,
      currency: "KRW",
    });
  });

  it("가입 전환은 계정별로 한 번만 보낸다", () => {
    trackSignUpConversion("user-1");
    trackSignUpConversion("user-1");

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "CompleteRegistration");
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("초대 토큰 URL에서는 가입 전환과 Meta 초기화를 모두 막는다", () => {
    window.history.replaceState(window.history.state, "", "/invite/private-token");

    trackSignUpConversion("user-sensitive");

    expect(fbq).not.toHaveBeenCalled();
    expect(gtag).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("conv:signup:user-sensitive")).toBeNull();
    window.history.replaceState(window.history.state, "", "/");
  });

  it("fbq 가 늦게 생겨도 전환을 보낸다", () => {
    vi.useFakeTimers();
    delete window.fbq;
    trackPurchaseConversion("order-2", 1000);
    window.fbq = fbq;
    vi.advanceTimersByTime(200);
    vi.useRealTimers();

    expect(fbq).toHaveBeenCalledWith("track", "Purchase", { value: 1000, currency: "KRW" });
  });

  it("민감 경로에서 주소를 정리한 뒤에도 Meta Pixel을 지연 초기화할 수 있다", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete window.fbq;

    initializeMetaPixel();

    expect(document.querySelector(
      'script[src="https://connect.facebook.net/en_US/fbevents.js"]',
    )).not.toBeNull();
    const initializedFbq = Reflect.get(window, "fbq") as { queue?: unknown[][] };
    expect(initializedFbq.queue?.[0]).toEqual(["init", META_PIXEL_ID]);
  });
});

describe("가입 표식 쿠키", () => {
  const now = Date.parse("2026-11-05T00:10:00Z");
  const redirect = () => NextResponse.redirect("https://example.com/me");

  it("방금 만든 계정에만 남긴다", () => {
    const fresh = redirect();
    markIfNewAccount(fresh, { id: "u1", created_at: "2026-11-05T00:09:00Z" }, now);
    expect(fresh.cookies.get(SIGNUP_MARK_COOKIE)?.value).toBe("u1");
    expect(fresh.headers.get("set-cookie")).toContain("Max-Age=86400");

    const old = redirect();
    markIfNewAccount(old, { id: "u2", created_at: "2026-11-01T00:00:00Z" }, now);
    expect(old.cookies.get(SIGNUP_MARK_COOKIE)).toBeUndefined();
  });

  it("사용자 정보가 없으면 아무것도 하지 않는다", () => {
    const response = redirect();
    markIfNewAccount(response, null, now);
    expect(response.cookies.get(SIGNUP_MARK_COOKIE)).toBeUndefined();
  });
});
