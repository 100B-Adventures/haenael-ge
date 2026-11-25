"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  type AnalyticsConsent,
  getAnalyticsConsent,
} from "@/lib/analytics/consent";
import {
  hasSupabaseBrowserConfig,
  resolveAnalyticsConsentFromAccount,
} from "@/lib/analytics/account-consent";
import { createClient } from "@/lib/supabase/client";

export function useAnalyticsConsent(): AnalyticsConsent | null | undefined {
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => setConsent(getAnalyticsConsent());
    let active = true;
    const syncAccount = async () => {
      const resolved = await resolveAnalyticsConsentFromAccount();
      if (active) setConsent(resolved);
    };
    void syncAccount();
    const authListener = hasSupabaseBrowserConfig()
      ? createClient().auth.onAuthStateChange(() => {
        void syncAccount();
      }).data.subscription
      : null;
    window.addEventListener(ANALYTICS_CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      authListener?.unsubscribe();
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return consent;
}
