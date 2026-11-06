"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  type AnalyticsConsent,
  getAnalyticsConsent,
} from "@/lib/analytics/consent";

export function useAnalyticsConsent(): AnalyticsConsent | null {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);

  useEffect(() => {
    const sync = () => setConsent(getAnalyticsConsent());
    sync();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return consent;
}
