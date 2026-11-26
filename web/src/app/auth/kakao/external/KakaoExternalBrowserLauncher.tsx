"use client";

import { useEffect, useState } from "react";
import {
  buildKakaoStartUrl,
  KAKAO_MANUAL_FALLBACK_DELAY_MS,
  startKakaoLogin,
} from "@/lib/auth/kakao-navigation";
import { KAKAO_NAVIGATION_COPY } from "@/lib/copy/generated/lib-auth-kakao-navigation";

export function KakaoExternalBrowserLauncher({
  redirectPath,
  autoLaunch,
  externalUrl,
  fallbackUrl,
  deviceInstruction,
  statusMessage = KAKAO_NAVIGATION_COPY.EXTERNAL_BROWSER_NOTICE,
}: {
  redirectPath: string;
  autoLaunch: boolean;
  externalUrl: string;
  fallbackUrl: string;
  deviceInstruction: string;
  statusMessage?: string;
}) {
  const startUrl = buildKakaoStartUrl(redirectPath);
  const [fallbackReady, setFallbackReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setFallbackReady(true),
      KAKAO_MANUAL_FALLBACK_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!autoLaunch) return;
    const timer = window.setTimeout(() => {
      startKakaoLogin(startUrl, {
        forceKakaoInApp: true,
        notifyUser: false,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [autoLaunch, startUrl]);

  return (
    <main className="min-h-svh bg-background px-[22px] py-10">
      <section className="mx-auto flex max-w-sm flex-col gap-4 rounded-md border border-border bg-card p-6 text-center">
        <p className="text-[length:var(--text-body)]! font-bold text-foreground" role="status">
          {statusMessage}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground" data-testid="kakao-device-instruction">
          {deviceInstruction}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground" data-testid="kakao-draft-warning">
          {KAKAO_NAVIGATION_COPY.DRAFT_WARNING}
        </p>
        <a
          href={externalUrl}
          className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-bold text-primary-foreground"
          data-testid="kakao-external-browser-link"
        >
          {KAKAO_NAVIGATION_COPY.EXTERNAL_BROWSER_ACTION}
        </a>
        {!fallbackReady ? (
          <>
            <span
              className="flex min-h-11 items-center justify-center font-semibold text-muted-foreground"
              data-testid="kakao-external-fallback-countdown"
            >
              {KAKAO_NAVIGATION_COPY.FALLBACK_ACTION} ({KAKAO_MANUAL_FALLBACK_DELAY_MS / 1_000}초)
            </span>
            <noscript>
              <a
                href={fallbackUrl}
                className="flex min-h-11 items-center justify-center font-semibold text-accent-foreground underline underline-offset-2"
                data-testid="kakao-external-noscript-link"
              >
                {KAKAO_NAVIGATION_COPY.FALLBACK_ACTION}
              </a>
            </noscript>
          </>
        ) : (
          <a
            href={fallbackUrl}
            className="flex min-h-11 items-center justify-center font-semibold text-accent-foreground underline underline-offset-2"
            data-testid="kakao-external-fallback-link"
          >
            {KAKAO_NAVIGATION_COPY.FALLBACK_ACTION}
          </a>
        )}
      </section>
    </main>
  );
}
