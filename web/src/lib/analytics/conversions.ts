// lib/analytics/conversions.ts — 광고 전환 이벤트 한 곳(2026-11-05).
// Meta 픽셀과 GA4 로 같은 전환을 보낸다. 닉네임·전화번호·이메일은 넘기지 않는다.
// Lead 는 없다: lead-capture 함수는 있으나 웹 화면이 호출하지 않는다.

import { trackEvent } from "@/lib/analytics";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const SIGNUP_MARK_COOKIE = "hg_signup_mark";

const FBQ_WAIT_MS = 5000;
const FBQ_POLL_MS = 100;

// 결제 완료·가입 직후 화면은 전체 새로고침으로 열린다. React 효과가 afterInteractive 스크립트보다
// 먼저 돌 수 있어 fbq 가 생길 때까지 잠깐 기다린다. 끝내 없으면(개발 빌드·차단) 조용히 끝낸다.
function sendToMeta(event: string, params?: Record<string, unknown>) {
  const startedAt = Date.now();
  const attempt = () => {
    if (window.fbq) {
      if (params) window.fbq("track", event, params);
      else window.fbq("track", event);
      return;
    }
    if (Date.now() - startedAt < FBQ_WAIT_MS) window.setTimeout(attempt, FBQ_POLL_MS);
  };
  attempt();
}

function firstTime(key: string): boolean {
  try {
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, "1");
  } catch {
    // 저장소가 막힌 브라우저에서는 그대로 보낸다.
  }
  return true;
}

export function trackSignUpConversion(userId: string): void {
  if (typeof window === "undefined" || !firstTime(`conv:signup:${userId}`)) return;
  sendToMeta("CompleteRegistration");
  trackEvent("sign_up");
}

/** value 는 toss-confirm 이 서버 주문 금액·토스 승인 금액과 대조해 통과시킨 값만 넘긴다. */
export function trackPurchaseConversion(orderId: string, value: number): void {
  if (typeof window === "undefined" || !firstTime(`conv:purchase:${orderId}`)) return;
  sendToMeta("Purchase", { value, currency: "KRW" });
  trackEvent("purchase", { transaction_id: orderId, value, currency: "KRW" });
}
