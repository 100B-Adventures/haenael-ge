"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
import { createClient } from "@/lib/supabase/client";
import {
  latestAnnouncedRelease,
  newerReleaseVersion,
  WHATS_NEW_LAST_SEEN_KEY,
  WHATS_NEW_USER_METADATA_KEY,
} from "@/lib/release-notes";

export { WHATS_NEW_LAST_SEEN_KEY } from "@/lib/release-notes";

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
    const announced = latestAnnouncedRelease;
    if (consent === null || !announced || isWhatsNewExcludedPath(pathname)) {
      setVisible(false);
      return;
    }

    let active = true;
    const syncSeenVersion = async () => {
      let localVersion: string | null = null;
      try {
        localVersion = window.localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY);
      } catch {
        // 저장소가 차단돼도 회원 메타데이터 확인과 이번 방문의 안내는 동작한다.
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!active) return;

      const user = data.user;
      const metadataVersion = typeof user?.user_metadata?.[WHATS_NEW_USER_METADATA_KEY] === "string"
        ? user.user_metadata[WHATS_NEW_USER_METADATA_KEY]
        : null;
      const newestSeenVersion = newerReleaseVersion(localVersion, metadataVersion);
      const hasSeenCurrent = newerReleaseVersion(newestSeenVersion, announced.version) === newestSeenVersion;
      const versionToPersist = hasSeenCurrent ? newestSeenVersion : announced.version;

      try {
        window.localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, versionToPersist!);
      } catch {
        // 브라우저 저장소가 차단되면 회원 메타데이터를 우선 사용한다.
      }

      if (user && metadataVersion !== versionToPersist) {
        await supabase.auth.updateUser({
          data: { [WHATS_NEW_USER_METADATA_KEY]: versionToPersist },
        });
        if (!active) return;
      }

      if (hasSeenCurrent) return;
      setVisible(true);
      trackEvent("whats_new_view", { release: announced.version });
    };

    void syncSeenVersion();
    return () => {
      active = false;
    };
  }, [consent, pathname]);

  const release = latestAnnouncedRelease;
  if (!visible || !release) return null;

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
      <p className="whats-new-kicker">새로운 기능 · {release.version}</p>
      <h2 id="whats-new-title">{release.title}</h2>
      <p className="whats-new-summary">{release.summary}</p>
      <div className="whats-new-actions">
        <Link
          href={release.tryHref}
          prefetch={false}
          className="whats-new-primary"
          onClick={() => trackEvent("whats_new_try", { release: release.version })}
        >
          써 보기
        </Link>
        <Link
          href={release.feedbackHref}
          prefetch={false}
          className="whats-new-secondary"
        >
          의견 남기기
        </Link>
      </div>
    </aside>
  );
}
