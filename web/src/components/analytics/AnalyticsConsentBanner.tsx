"use client";

import Link from "next/link";
import { useState } from "react";
import { persistAnalyticsConsent } from "@/lib/analytics/account-consent";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-analytics-analyticsconsentbanner";

export function AnalyticsConsentBanner() {
  const consent = useAnalyticsConsent();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  if (consent !== null) return null;

  const choose = async (nextConsent: "granted" | "denied") => {
    setSaving(true);
    setError(false);
    try {
      await persistAnalyticsConsent(nextConsent);
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  return (
    <section
      className="receiver-analytics-consent-banner"
      role="dialog"
      aria-label="분석 도구 동의"
      data-testid="analytics-consent-banner"
    >
      <div className="receiver-analytics-consent-copy">
        <p>{PRODUCT_COPY.PROMPT}</p>
        <Link href="/privacy#analytics-overseas">{PRODUCT_COPY.DETAIL}</Link>
      </div>
      <div className="receiver-analytics-consent-actions">
        <button
          type="button"
          className="receiver-analytics-consent-deny"
          aria-label="분석 정보 국외 이전에 동의하지 않음"
          disabled={saving}
          onClick={() => void choose("denied")}
        >
          {PRODUCT_COPY.DENY}
        </button>
        <button
          type="button"
          className="receiver-analytics-consent-grant"
          aria-label="분석 정보 국외 이전에 동의"
          disabled={saving}
          onClick={() => void choose("granted")}
        >
          {PRODUCT_COPY.GRANT}
        </button>
      </div>
      {error ? <p className="receiver-analytics-consent-error" role="alert">{PRODUCT_COPY.SAVE_ERROR}</p> : null}
    </section>
  );
}
