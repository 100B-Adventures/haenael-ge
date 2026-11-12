// lib/analytics/index.ts — GA4 gtag 초기화·이벤트
// architecture §6: 수집=앱(web), 분석=MARKETING 중앙 테넌트.
// 슬라이스 #1 scaffold: GA_MEASUREMENT_ID env 기반 초기화 + 이벤트 타입 정의.

import { hasAnalyticsConsent } from "@/lib/analytics/consent";

declare global {
  interface Window {
    gtag?: (
      command: "config" | "consent" | "event" | "js",
      targetIdOrEvent: string | Date,
      params?: Record<string, unknown>,
    ) => void;
    dataLayer?: unknown[];
    haenaelGtagPending?: GtagCall[];
    haenaelGtagMeasurementId?: string;
  }
}

type GtagCommand = "config" | "consent" | "event" | "js";
type GtagCall = [GtagCommand, string | Date, Record<string, unknown>?];

/** 핵심 이벤트 (architecture §6 에서 확정) */
export type HaenaelEvent =
  | "lead_submitted"
  | "goal_created"
  | "cheer_started"
  | "payment_success"
  | "report_submitted"
  | "share_link_copied"
  | "cheer_initiated"
  | "cheer_completed"
  | "wordmap_viewed"
  | "wordmap_shared"
  | "cashout_initiated"
  | "sign_up"
  | "login"
  | "purchase";

/** 결제 키와 초대 토큰이 URL에 포함될 수 있어 외부 분석 도구가 읽으면 안 되는 경로. */
export const SENSITIVE_ANALYTICS_PATH_SOURCE = "^/(?:payment|invite)(?:/|$)";
const SENSITIVE_ANALYTICS_PATH = new RegExp(SENSITIVE_ANALYTICS_PATH_SOURCE);

export function isSensitiveAnalyticsPath(pagePath: string): boolean {
  return SENSITIVE_ANALYTICS_PATH.test(sanitizePagePath(pagePath));
}

export function sanitizePagePath(pagePath: string): string {
  const pathOnly = pagePath.split(/[?#]/, 1)[0] || "/";
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

// config 전에 dataLayer에 event를 직접 넣으면 측정 대상이 없는 순서로 소비될 수 있다.
// 앱 대기열에 보존하고 initGA가 js → consent → config 뒤에 전달한다.
function callGtag(
  command: "config" | "event" | "js",
  targetIdOrEvent: string | Date,
  params?: Record<string, unknown>,
): boolean {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return false;
  if (window.gtag && window.haenaelGtagMeasurementId) {
    window.gtag(command, targetIdOrEvent, params);
    return true;
  }
  window.haenaelGtagPending = window.haenaelGtagPending ?? [];
  window.haenaelGtagPending.push([command, targetIdOrEvent, params]);
  return true;
}

export function trackPageView(pagePath: string): boolean {
  if (isSensitiveAnalyticsPath(pagePath)) return false;
  return callGtag("event", "page_view", { page_path: sanitizePagePath(pagePath) });
}

export function trackEvent(
  event: HaenaelEvent,
  params?: Record<string, unknown>,
): boolean {
  return callGtag("event", event, params);
}

export function initGA(measurementId: string): boolean {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !measurementId) return false;
  if (window.gtag && window.haenaelGtagMeasurementId === measurementId) return true;

  const pending = window.haenaelGtagPending?.splice(0) ?? [];
  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    function gtag(..._args: unknown[]) {
      // GA4의 표준 gtag 큐 형식은 arguments 객체다.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    }
    window.gtag = gtag as NonNullable<Window["gtag"]>;
  }
  const gtag = window.gtag;
  if (!gtag) return false;

  gtag("js", new Date());
  gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
  gtag("config", measurementId, {
    send_page_view: false,
    cookie_domain: window.location.hostname,
  });
  window.haenaelGtagMeasurementId = measurementId;

  for (const [command, targetIdOrEvent, params] of pending) {
    gtag(command, targetIdOrEvent, params);
  }
  return true;
}
