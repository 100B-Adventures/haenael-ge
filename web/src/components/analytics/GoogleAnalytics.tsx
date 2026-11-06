"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { Suspense, useEffect } from "react";
import { isSensitiveAnalyticsPath, trackPageView } from "@/lib/analytics";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

function RouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
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
      {/* onReady는 src 없는 Script에서 발화하지 않아 initGA가 영구 미실행되던 결함 — 인라인 초기화로 교체 */}
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
gtag('config', '${measurementId}', { send_page_view: false, cookie_domain: window.location.hostname });
`,
        }}
      />
      <Suspense fallback={null}><RouteTracker /></Suspense>
    </>
  );
}
