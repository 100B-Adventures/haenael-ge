"use client";

import { useState } from "react";
import { persistAnalyticsConsent } from "@/lib/analytics/account-consent";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

export function AnalyticsConsentControls() {
  const consent = useAnalyticsConsent();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const label = consent === "granted" ? "동의됨" : consent === "denied" ? "거부됨" : consent === undefined ? "확인 중" : "선택 전";

  const choose = async (nextConsent: "granted" | "denied") => {
    const shouldReload = consent === "granted";
    setSaving(true);
    setError(false);
    try {
      await persistAnalyticsConsent(nextConsent);
      if (shouldReload && nextConsent === "denied") window.location.reload();
      else setSaving(false);
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  return (
    <section className="my-5 rounded-[16px] border border-border bg-card p-4" data-testid="analytics-consent-controls">
      <p className="font-semibold">현재 분석·국외 이전 동의 상태: {label}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        철회하면 분석 쿠키를 삭제하고 페이지를 다시 불러와 추가 수집을 중단합니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-[12px] bg-primary px-4 text-sm font-bold text-primary-foreground"
          disabled={saving || consent === undefined}
          onClick={() => void choose("granted")}
        >
          분석·국외 이전에 동의
        </button>
        <button
          type="button"
          className="min-h-11 rounded-[12px] border border-border bg-background px-4 text-sm font-bold text-foreground"
          disabled={saving || consent === undefined}
          onClick={() => void choose("denied")}
        >
          동의 철회
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive" role="alert">선택을 저장하지 못했어요. 다시 시도해 주세요.</p> : null}
    </section>
  );
}
