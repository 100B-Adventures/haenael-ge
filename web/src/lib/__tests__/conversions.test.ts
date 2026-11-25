import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOGIN_MARK_COOKIE,
  SIGNUP_MARK_COOKIE,
  trackPurchaseConversion,
  trackLoginConversion,
  trackSignUpConversion,
} from "@/lib/analytics/conversions";
import { markAuthConversion } from "@/lib/auth/signup-mark";
import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";

describe("GA4 전환 이벤트", () => {
  const gtag = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    vi.clearAllMocks();
    window.gtag = gtag as typeof window.gtag;
    window.haenaelGtagMeasurementId = "G-TEST123";
  });

  afterEach(() => {
    delete window.gtag;
    delete window.haenaelGtagMeasurementId;
    vi.unstubAllEnvs();
  });

  it("Purchase 는 provider dedupe key, 주문번호, 금액과 KRW 를 함께 보낸다", async () => {
    await trackPurchaseConversion("order-1", 3000, "event-order-1");

    expect(gtag).toHaveBeenCalledWith("event", "purchase", {
      transaction_id: "order-1",
      event_id: "event-order-1",
      value: 3000,
      currency: "KRW",
    });
  });

  it("가입 전환은 provider enqueue 성공 뒤 계정별 완료 표식을 남긴다", async () => {
    await trackSignUpConversion("user-1");
    await trackSignUpConversion("user-1");

    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("기존 회원 로그인은 GA4 권장 login 이벤트와 method를 보낸다", () => {
    expect(trackLoginConversion("oauth")).toBe(true);
    expect(gtag).toHaveBeenCalledWith("event", "login", { method: "oauth" });
  });

  it("초대 토큰 URL에서는 가입 전환을 막는다", () => {
    window.history.replaceState(window.history.state, "", "/invite/private-token");

    trackSignUpConversion("user-sensitive");

    expect(gtag).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("conv:signup:user-sensitive")).toBeNull();
    window.history.replaceState(window.history.state, "", "/");
  });

  it("동의 상태여도 Meta 픽셀을 로드하지 않는다", async () => {
    await trackPurchaseConversion("order-2", 1000, "event-order-2");
    expect(document.querySelector('script[src*="connect.facebook.net"]')).toBeNull();
    expect(Reflect.get(window, "fbq")).toBeUndefined();
  });

  it("명시적 동의 전에는 GA4를 전송하지 않는다", async () => {
    window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    const queued = await trackPurchaseConversion("order-no-consent", 3000, "event-no-consent");

    expect(queued).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });
});

describe("가입 표식 쿠키", () => {
  const now = Date.parse("2026-11-05T00:10:00Z");
  const redirect = () => NextResponse.redirect("https://example.com/me");

  it("방금 만든 계정에만 남긴다", () => {
    const fresh = redirect();
    markAuthConversion(fresh, { id: "u1", created_at: "2026-11-05T00:09:00Z" }, now);
    expect(fresh.cookies.get(SIGNUP_MARK_COOKIE)?.value).toBe("u1");
    expect(fresh.cookies.get(LOGIN_MARK_COOKIE)).toBeUndefined();
    expect(fresh.headers.get("set-cookie")).toContain("Max-Age=86400");

    const old = redirect();
    markAuthConversion(old, { id: "u2", created_at: "2026-11-01T00:00:00Z" }, now);
    expect(old.cookies.get(SIGNUP_MARK_COOKIE)).toBeUndefined();
    expect(old.cookies.get(LOGIN_MARK_COOKIE)?.value).toBe("oauth");
  });

  it("사용자 정보가 없으면 아무것도 하지 않는다", () => {
    const response = redirect();
    markAuthConversion(response, null, now);
    expect(response.cookies.get(SIGNUP_MARK_COOKIE)).toBeUndefined();
    expect(response.cookies.get(LOGIN_MARK_COOKIE)).toBeUndefined();
  });
});
