// lib/analytics/conversions.ts — 광고 전환 이벤트 한 곳(2026-11-05).
// Meta 픽셀과 GA4 로 같은 전환을 보낸다. 닉네임·전화번호·이메일은 넘기지 않는다.
// Lead 는 없다: lead-capture 함수는 있으나 웹 화면이 호출하지 않는다.

import { isSensitiveAnalyticsPath, trackEvent } from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/lib/analytics/consent";

type MetaPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  queue?: unknown[][];
  version?: string;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
  }
}

export const SIGNUP_MARK_COOKIE = "hg_signup_mark";
export const META_PIXEL_ID = "1678305073814051";

const FBQ_WAIT_MS = 5000;
const FBQ_POLL_MS = 100;

/** 민감 URL을 안전한 경로로 교체한 뒤에도 전환을 보낼 수 있게 Pixel을 지연 초기화한다. */
export function initializeMetaPixel(): boolean {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return false;
  if (window.fbq) return true;
  if (process.env.NODE_ENV !== "production") return false;

  const fbq: MetaPixelFunction = (...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  };
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", META_PIXEL_ID);
  return true;
}

// 결제 완료·가입 직후 화면은 전체 새로고침으로 열린다. React 효과가 afterInteractive 스크립트보다
// 먼저 돌 수 있어 fbq 가 생길 때까지 잠깐 기다린다. 끝내 없으면(개발 빌드·차단) 조용히 끝낸다.
function sendToMeta(
  event: string,
  eventId: string,
  params?: Record<string, unknown>,
): Promise<boolean> {
  if (!initializeMetaPixel()) return Promise.resolve(false);
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      if (window.fbq) {
        window.fbq("track", event, params ?? {}, { eventID: eventId });
        resolve(true);
        return;
      }
      if (Date.now() - startedAt < FBQ_WAIT_MS) {
        window.setTimeout(attempt, FBQ_POLL_MS);
      } else {
        resolve(false);
      }
    };
    attempt();
  });
}

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
  const metaQueued = await sendToMeta("CompleteRegistration", eventId);
  if (!gaQueued || !metaQueued) return false;
  markSent(marker);
  return true;
}

/**
 * value 는 toss-confirm 이 서버 주문 금액·토스 승인 금액과 대조해 통과시킨 값만 넘긴다.
 * true는 gtag/fbq 로컬 큐가 호출을 수락했다는 뜻이며 provider transport 성공을 뜻하지 않는다.
 * 호출자는 주문별 transaction_id와 eventID를 고정해 at-least-once 재시도를 provider dedupe에 맡긴다.
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
  const metaQueued = await sendToMeta("Purchase", eventId, { value, currency: "KRW" });
  return gaQueued && metaQueued;
}
