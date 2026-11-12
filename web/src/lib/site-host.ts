// 운영 canonical 호스트. proxy 리다이렉트와 분석 도구 로드 판단이 같은 값을 쓴다.
export const CANONICAL_HOST = "haenael-ge.vercel.app";

// E2E 가 staging·로컬에서 분석 도구 배선(동의 → 로드 → 이벤트 형태)을 확인할 때만 켜는 명시 플래그.
// 이 플래그를 켜는 시험은 모든 분석 요청을 page.route 로 가로채 abort 해야 한다(운영 속성 무전송).
export const ANALYTICS_E2E_INTERCEPT_KEY = "haenael_analytics_e2e_intercepted_v1";

// 운영 측정 ID(GA4·Clarity·Meta Pixel)는 운영 canonical 호스트에서만 싣는다.
// staging·preview·로컬에서 운영 속성으로 시험 이벤트가 섞이지 않게 한다(growth-measurement 표준).
export function isAnalyticsProductionHost(
  hostname: string = typeof window === "undefined" ? "" : window.location.hostname,
): boolean {
  if (hostname === CANONICAL_HOST) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ANALYTICS_E2E_INTERCEPT_KEY) === "1";
  } catch {
    return false;
  }
}
