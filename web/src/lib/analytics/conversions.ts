// lib/analytics/conversions.ts — 동의 후 GA4 전환 이벤트 한 곳(2026-11-05).
// 닉네임·전화번호·이메일은 넘기지 않는다. Meta 픽셀은 광고 집행 전까지 로드하지 않는다.
// Lead 는 없다: lead-capture 함수는 있으나 웹 화면이 호출하지 않는다.

import { isSensitiveAnalyticsPath, trackEvent } from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/lib/analytics/consent";

export const SIGNUP_MARK_COOKIE = "hg_signup_mark";
export const LOGIN_MARK_COOKIE = "hg_login_mark";
function wasSent(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSent(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // 저장소가 막혀도 provider dedupe key가 중복을 제한한다.
  }
}

export async function trackSignUpConversion(userId: string): Promise<boolean> {
  const marker = `conv:signup:${userId}`;
  if (
    typeof window === "undefined" || isSensitiveAnalyticsPath(window.location.pathname) ||
    !hasAnalyticsConsent() || wasSent(marker)
  ) return false;
  const eventId = `haenael-signup:${userId}`;
  const gaQueued = trackEvent("sign_up", { event_id: eventId });
  if (!gaQueued) return false;
  markSent(marker);
  return true;
}

export function trackLoginConversion(method = "oauth"): boolean {
  if (
    typeof window === "undefined" || isSensitiveAnalyticsPath(window.location.pathname) ||
    !hasAnalyticsConsent()
  ) return false;
  return trackEvent("login", { method });
}

/**
 * value 는 toss-confirm 이 서버 주문 금액·토스 승인 금액과 대조해 통과시킨 값만 넘긴다.
 * true는 gtag 로컬 큐가 호출을 수락했다는 뜻이며 전송 성공을 뜻하지 않는다.
 * 호출자는 주문별 transaction_id와 event_id를 고정해 중복 전송을 제한한다.
 */
export async function trackPurchaseConversion(
  orderId: string,
  value: number,
  eventId: string,
): Promise<boolean> {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return false;
  const gaQueued = trackEvent("purchase", {
    transaction_id: orderId,
    event_id: eventId,
    value,
    currency: "KRW",
  });
  return gaQueued;
}
