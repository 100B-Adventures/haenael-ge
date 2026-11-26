"use client";

import type { AnalyticsConsent } from "@/lib/analytics/consent";
import { useAnalyticsConsentState } from "@/components/analytics/AnalyticsConsentProvider";

export function useAnalyticsConsent(): AnalyticsConsent | null | undefined {
  return useAnalyticsConsentState().consent;
}
