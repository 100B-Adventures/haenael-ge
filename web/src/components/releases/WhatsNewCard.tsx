"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
import { latestPublicRelease } from "@/lib/release-notes";

export const WHATS_NEW_LAST_SEEN_KEY = "haenael_whats_new_last_seen_version";

export function isWhatsNewExcludedPath(pathname: string): boolean {
  return pathname === "/updates" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/payment/");
}
export function WhatsNewCard() {
  const pathname = usePathname() ?? "";
  const consent = useAnalyticsConsent();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (consent === null || !latestPublicRelease.notify || isWhatsNewExcludedPath(pathname)) {
      setVisible(false);
      return;
    }

    try {
      if (window.localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY) === latestPublicRelease.version) return;
      window.localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, latestPublicRelease.version);
    } catch {
      // 저장소가 차단돼도 이번 방문의 안내와 닫기는 동작한다.
    }

    setVisible(true);
    trackEvent("whats_new_view", { release: latestPublicRelease.version });
  }, [consent, pathname]);

  if (!visible) return null;

  return (
    <aside
      className="whats-new-card"
      role="dialog"
      aria-labelledby="whats-new-title"
      data-testid="whats-new-card"
    >
      <button
        type="button"
        className="whats-new-close"
        aria-label="새로운 기능 안내 닫기"
        onClick={() => setVisible(false)}
      >
        <X aria-hidden="true" />
      </button>
      <p className="whats-new-kicker">새로운 기능 · {latestPublicRelease.version}</p>
      <h2 id="whats-new-title">{latestPublicRelease.title}</h2>
      <p className="whats-new-summary">{latestPublicRelease.summary}</p>
      <div className="whats-new-actions">
        <Link
          href={latestPublicRelease.tryHref}
          className="whats-new-primary"
          onClick={() => trackEvent("whats_new_try", { release: latestPublicRelease.version })}
        >
          써 보기
        </Link>
        <Link
          href={latestPublicRelease.feedbackHref}
          className="whats-new-secondary"
          onClick={() => trackEvent("whats_new_feedback", { release: latestPublicRelease.version })}
        >
          의견 남기기
        </Link>
      </div>
    </aside>
  );
}
