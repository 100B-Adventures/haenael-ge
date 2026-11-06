"use client";

import { useEffect } from "react";
import { isSensitiveAnalyticsPath } from "@/lib/analytics";

export function shouldUseDocumentNavigation(rawHref: string, currentOrigin: string): boolean {
  try {
    const url = new URL(rawHref, currentOrigin);
    return url.origin === currentOrigin && isSensitiveAnalyticsPath(url.pathname);
  } catch {
    return false;
  }
}

/**
 * 이미 시작된 Clarity 세션이 SPA 주소 변경으로 결제 키·초대 토큰을 보지 않게 한다.
 * 민감 경로 링크는 새 document 요청으로 열어 RootLayout의 초기화 차단을 다시 적용한다.
 */
export function SensitiveNavigationBoundary() {
  useEffect(() => {
    const forceDocumentNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey
      ) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.hasAttribute("download")) return;
      if (!shouldUseDocumentNavigation(anchor.href, window.location.origin)) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(anchor.href);
    };

    document.addEventListener("click", forceDocumentNavigation, true);
    return () => document.removeEventListener("click", forceDocumentNavigation, true);
  }, []);

  return null;
}
