"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";
import { initGA, isSensitiveAnalyticsPath, trackPageView } from "@/lib/analytics";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
import { isAnalyticsProductionHost } from "@/lib/site-host";

function RouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

function GtagInitializer({ measurementId }: { measurementId: string }) {
  useEffect(() => {
    initGA(measurementId);
  }, [measurementId]);
  return null;
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  // Consent changes rerender this boundary. The tag remains loaded in denied mode;
  // consent.ts sends the update command without remounting the external script.
  useAnalyticsConsent();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (
    process.env.NODE_ENV !== "production" ||
    !isAnalyticsProductionHost() ||
    !measurementId ||
    measurementId === "G-XXXXXXXXXX" ||
    isSensitiveAnalyticsPath(pathname)
  ) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <GtagInitializer measurementId={measurementId} />
      <Suspense fallback={null}><RouteTracker /></Suspense>
    </>
  );
}
