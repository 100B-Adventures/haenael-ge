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
  | "goal_created"
  | "share_link_copied"
  | "cheer_initiated"
  | "cheer_completed"
  | "wordmap_viewed"
  | "wordmap_shared"
  | "cashout_initiated";

export function trackEvent(
  event: HaenaelEvent,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, params);
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
  gtag("config", measurementId);
}
