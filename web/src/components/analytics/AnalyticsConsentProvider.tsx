"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  type AnalyticsConsent,
  clearAnalyticsConsent,
  getAnalyticsConsent,
} from "@/lib/analytics/consent";
import {
  hasSupabaseBrowserConfig,
  resolveAnalyticsConsentStateFromAccount,
} from "@/lib/analytics/account-consent";
import { createClient } from "@/lib/supabase/client";

type AnalyticsConsentContextValue = {
  consent: AnalyticsConsent | null | undefined;
  isAuthenticated: boolean | undefined;
};

const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalyticsConsentContextValue>({
    consent: undefined,
    isAuthenticated: undefined,
  });
  const syncPromise = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    const syncAccount = () => {
      if (syncPromise.current) return syncPromise.current;
      syncPromise.current = resolveAnalyticsConsentStateFromAccount()
        .then((resolved) => {
          if (active) setState(resolved);
        })
        .finally(() => {
          syncPromise.current = null;
        });
      return syncPromise.current;
    };
    const syncLocal = () => {
      setState((current) => ({ ...current, consent: getAnalyticsConsent() }));
    };

    void syncAccount();
    const authListener = hasSupabaseBrowserConfig()
      ? createClient().auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          clearAnalyticsConsent();
          setState({ consent: null, isAuthenticated: false });
          return;
        }
        void syncAccount();
      }).data.subscription
      : null;
    const syncStorage = () => void syncAccount();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncLocal);
    window.addEventListener("storage", syncStorage);
    return () => {
      active = false;
      authListener?.unsubscribe();
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncLocal);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  return (
    <AnalyticsConsentContext.Provider value={state}>
      {children}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsentState(): AnalyticsConsentContextValue {
  const state = useContext(AnalyticsConsentContext);
  if (!state) throw new Error("AnalyticsConsentProvider is required");
  return state;
}
