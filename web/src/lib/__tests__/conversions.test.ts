import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SIGNUP_MARK_COOKIE,
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

  it("fbq 가 늦게 생겨도 전환을 보낸다", () => {
    vi.useFakeTimers();
    delete window.fbq;
    trackPurchaseConversion("order-2", 1000);
    window.fbq = fbq;
    vi.advanceTimersByTime(200);
    vi.useRealTimers();

    expect(fbq).toHaveBeenCalledWith("track", "Purchase", { value: 1000, currency: "KRW" });
  });
});

describe("가입 표식 쿠키", () => {
  const now = Date.parse("2026-11-05T00:10:00Z");
  const redirect = () => NextResponse.redirect("https://example.com/me");

  it("방금 만든 계정에만 남긴다", () => {
    const fresh = redirect();
    markIfNewAccount(fresh, { id: "u1", created_at: "2026-11-05T00:09:00Z" }, now);
    expect(fresh.cookies.get(SIGNUP_MARK_COOKIE)?.value).toBe("u1");

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
