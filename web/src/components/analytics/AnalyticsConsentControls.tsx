"use client";

import { setAnalyticsConsent } from "@/lib/analytics/consent";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

export function AnalyticsConsentControls() {
  const consent = useAnalyticsConsent();
  const label = consent === "granted" ? "동의됨" : consent === "denied" ? "거부됨" : "선택 전";

  const deny = () => {
    const shouldReload = consent === "granted";
    setAnalyticsConsent("denied");
    if (shouldReload) window.location.reload();
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
          onClick={() => setAnalyticsConsent("granted")}
        >
          분석·국외 이전에 동의
        </button>
        <button
          type="button"
          className="min-h-11 rounded-[12px] border border-border bg-background px-4 text-sm font-bold text-foreground"
          onClick={deny}
        >
          동의 철회
        </button>
      </div>
    </section>
  );
}
