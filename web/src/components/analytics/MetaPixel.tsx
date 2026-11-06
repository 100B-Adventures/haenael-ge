"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isSensitiveAnalyticsPath } from "@/lib/analytics";
import { initializeMetaPixel } from "@/lib/analytics/conversions";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

/** 민감 URL을 제외한 화면에서 Meta Pixel을 시작하고 PageView를 보낸다. */
export function MetaPixel() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();

  useEffect(() => {
    if (consent !== "granted" || isSensitiveAnalyticsPath(pathname)) return;
    initializeMetaPixel();
    window.fbq?.("track", "PageView");
  }, [consent, pathname]);

  return null;
}
