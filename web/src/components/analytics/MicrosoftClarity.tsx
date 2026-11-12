"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isSensitiveAnalyticsPath } from "@/lib/analytics";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
import { isAnalyticsProductionHost } from "@/lib/site-host";

const CLARITY_PROJECT_ID = "z7rlqfvdmm";

export function MicrosoftClarity() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  if (
    process.env.NODE_ENV !== "production" || consent !== "granted" ||
    !isAnalyticsProductionHost() ||
    isSensitiveAnalyticsPath(pathname)
  ) return null;

  return (
    <Script
      id="clarity-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_PROJECT_ID}");window.clarity("consentv2",{ad_Storage:"granted",analytics_Storage:"granted"});`,
      }}
    />
  );
}
