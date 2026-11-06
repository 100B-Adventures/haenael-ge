"use client";

import Link from "next/link";
import { setAnalyticsConsent } from "@/lib/analytics/consent";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

export function AnalyticsConsentBanner() {
  const consent = useAnalyticsConsent();
  if (consent !== null) return null;

  return (
    <section
      className="receiver-analytics-consent-banner fixed inset-x-4 z-50 mx-auto max-w-[640px] rounded-[16px] border border-border bg-card p-4 shadow-lg"
      role="dialog"
      aria-label="분석 도구 동의"
      data-testid="analytics-consent-banner"
    >
      <p className="text-[15px] font-bold text-foreground">분석 정보의 국외 이전에 동의하시겠어요?</p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        별도 동의한 경우에만 방문·가입·결제 분석 정보를 Google, Microsoft, Meta의 미국 서버로 HTTPS 전송합니다.
        수령자별 항목과 보유기간은 상세 고지에서 확인할 수 있고, 거부해도 서비스 이용에는 제한이 없으며 언제든 철회할 수 있습니다.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="min-h-11 rounded-[12px] border border-border bg-background px-3 text-[14px] font-bold text-foreground transition-transform active:translate-y-px"
          onClick={() => setAnalyticsConsent("denied")}
        >
          국외 이전에 동의하지 않음
        </button>
        <button
          type="button"
          className="min-h-11 rounded-[12px] bg-primary px-3 text-[14px] font-bold text-primary-foreground transition-transform active:translate-y-px"
          onClick={() => setAnalyticsConsent("granted")}
        >
          분석·국외 이전에 동의
        </button>
      </div>
      <Link
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[12px] text-center text-[13px] underline transition-transform active:translate-y-px"
        href="/privacy"
      >
        전송 항목과 국외 이전 상세 보기
      </Link>
    </section>
  );
}
