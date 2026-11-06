// lib/analytics/index.ts — GA4 gtag 초기화·이벤트
// architecture §6: 수집=앱(web), 분석=MARKETING 중앙 테넌트.
// 슬라이스 #1 scaffold: GA_MEASUREMENT_ID env 기반 초기화 + 이벤트 타입 정의.

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event" | "js",
      targetIdOrEvent: string | Date,
      params?: Record<string, unknown>,
    ) => void;
    dataLayer?: unknown[];
  }
}

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

// gtag 미초기화 시에도 이벤트가 유실되지 않도록 dataLayer에 직접 push하는 폴백.
// gtag()는 arguments 객체를 push하므로 동일한 형태로 맞춘다(초기화 후 GA가 큐를 소비).
function callGtag(
  command: "config" | "event" | "js",
  targetIdOrEvent: string | Date,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (window.gtag) {
    window.gtag(command, targetIdOrEvent, params);
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  const args: unknown[] =
    params === undefined ? [command, targetIdOrEvent] : [command, targetIdOrEvent, params];
  (function (..._args: unknown[]) {
    window.dataLayer!.push(arguments);
  })(...args);
}

export function trackPageView(pagePath: string): void {
  if (isSensitiveAnalyticsPath(pagePath)) return;
  callGtag("event", "page_view", { page_path: sanitizePagePath(pagePath) });
}

export function trackEvent(
  event: HaenaelEvent,
  params?: Record<string, unknown>,
): void {
  callGtag("event", event, params);
}

export function initGA(measurementId: string): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  }
  window.gtag = gtag as typeof window.gtag;
  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: false });
}
