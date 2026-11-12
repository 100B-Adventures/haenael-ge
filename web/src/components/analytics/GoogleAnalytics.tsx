"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";
import { initGA, isSensitiveAnalyticsPath, trackPageView } from "@/lib/analytics";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

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
  const consent = useAnalyticsConsent();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (
    process.env.NODE_ENV !== "production" ||
    consent !== "granted" ||
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
