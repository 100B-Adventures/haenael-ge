"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isSensitiveAnalyticsPath } from "@/lib/analytics";
import { initializeMetaPixel } from "@/lib/analytics/conversions";

/** 민감 URL을 제외한 화면에서 Meta Pixel을 시작하고 PageView를 보낸다. */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (isSensitiveAnalyticsPath(pathname)) return;
    initializeMetaPixel();
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return null;
}
