import { KAKAO_NAVIGATION_COPY } from "@/lib/copy/generated/lib-auth-kakao-navigation";

export const KAKAO_EXTERNAL_BROWSER_QUERY = "external_browser";
export const KAKAO_EXTERNAL_BROWSER_FALLBACK_MS = 1_200;

export function buildKakaoStartUrl(redirectPath: string): string {
  return `/auth/kakao/start?redirect=${encodeURIComponent(redirectPath)}`;
}

export function isKakaoTalkInAppBrowser(userAgent: string): boolean {
  return /KAKAOTALK/i.test(userAgent);
}

export function buildExternalKakaoStartUrl(
  origin: string,
  startUrl: string,
): string {
  const externalUrl = new URL(startUrl, origin);
  externalUrl.searchParams.set(KAKAO_EXTERNAL_BROWSER_QUERY, "1");
  return externalUrl.href;
}

export function buildKakaoOpenExternalUrl(
  origin: string,
  startUrl: string,
): string {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(
    buildExternalKakaoStartUrl(origin, startUrl),
  )}`;
}

export function buildKakaoExternalGuideUrl(
  origin: string,
  startUrl: string,
): string {
  const requestedStart = new URL(startUrl, origin);
  const guideUrl = new URL("/auth/kakao/external", origin);
  guideUrl.searchParams.set(
    "redirect",
    requestedStart.searchParams.get("redirect") ?? "/onboarding",
  );
  guideUrl.searchParams.set("auto", "0");
  return guideUrl.href;
}

interface KakaoNavigationEnvironment {
  userAgent: string;
  origin: string;
  isVisible: () => boolean;
  notify: (message: string) => void;
  assign: (url: string) => void;
  setFallback: (callback: () => void, delayMs: number) => number;
  clearFallback: (timer: number) => void;
  onPageExit: (callback: () => void) => () => void;
}

interface StartKakaoLoginOptions {
  forceKakaoInApp?: boolean;
  notifyUser?: boolean;
  environment?: KakaoNavigationEnvironment;
}

function browserEnvironment(): KakaoNavigationEnvironment {
  return {
    userAgent: window.navigator.userAgent,
    origin: window.location.origin,
    isVisible: () => document.visibilityState !== "hidden",
    notify: (message) => window.alert(message),
    assign: (url) => window.location.assign(url),
    setFallback: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearFallback: (timer) => window.clearTimeout(timer),
    onPageExit: (callback) => {
      const handleVisibility = () => {
        if (document.visibilityState === "hidden") callback();
      };
      window.addEventListener("pagehide", callback, { once: true });
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        window.removeEventListener("pagehide", callback);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    },
  };
}

/**
 * KakaoTalk's `openExternal` scheme is not a documented web API. If it fails,
 * move to an instruction page instead of silently retrying OAuth in the same
 * in-app browser where session cookies may not be applied.
 */
export function startKakaoLogin(
  startUrl: string,
  options: StartKakaoLoginOptions = {},
): void {
  const environment = options.environment ?? browserEnvironment();
  const isKakaoInApp = options.forceKakaoInApp ??
    isKakaoTalkInAppBrowser(environment.userAgent);

  if (!isKakaoInApp) {
    environment.assign(startUrl);
    return;
  }

  if (options.notifyUser !== false) {
    environment.notify(
      `${KAKAO_NAVIGATION_COPY.EXTERNAL_BROWSER_NOTICE}\n\n${KAKAO_NAVIGATION_COPY.DRAFT_WARNING}`,
    );
  }

  let leftCurrentPage = false;
  const fallbackUrl = buildKakaoExternalGuideUrl(environment.origin, startUrl);
  let fallbackTimer: number | null = null;
  let removeExitListeners: () => void = () => {};
  const cancelFallback = () => {
    leftCurrentPage = true;
    if (fallbackTimer) environment.clearFallback(fallbackTimer);
    removeExitListeners();
  };
  removeExitListeners = environment.onPageExit(cancelFallback);
  fallbackTimer = environment.setFallback(() => {
    removeExitListeners();
    if (!leftCurrentPage && environment.isVisible()) {
      environment.assign(fallbackUrl);
    }
  }, KAKAO_EXTERNAL_BROWSER_FALLBACK_MS);

  try {
    environment.assign(buildKakaoOpenExternalUrl(environment.origin, startUrl));
  } catch {
    removeExitListeners();
    if (fallbackTimer) environment.clearFallback(fallbackTimer);
    environment.assign(fallbackUrl);
  }
}
