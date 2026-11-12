export const ANALYTICS_CONSENT_KEY = "haenael_analytics_consent_v1";
export const ANALYTICS_CONSENT_EVENT = "haenael:analytics-consent";

export type AnalyticsConsent = "granted" | "denied";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === "granted";
}

function expireCookie(name: string) {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `${name}=; path=/; expires=${expires}; samesite=lax`;
  if (window.location.hostname.includes(".")) {
    document.cookie = `${name}=; path=/; domain=.${window.location.hostname}; expires=${expires}; samesite=lax`;
  }
}

export function clearAnalyticsCookies(): void {
  if (typeof document === "undefined") return;
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=", 1)[0];
    if (/^(_ga|_gid|_gat|_clck|_clsk|_fbp|_fbc)/.test(name)) expireCookie(name);
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  } catch {
    return;
  }
  if (consent === "denied") {
    window.haenaelGtagPending = [];
    window.gtag?.("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.clarity?.("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: "denied",
    });
    clearAnalyticsCookies();
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }));
}
