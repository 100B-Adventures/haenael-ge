"use client";

import { useEffect, useState } from "react";
import {
  buildKakaoOpenExternalUrl,
  buildKakaoStartUrl,
  startKakaoLogin,
} from "@/lib/auth/kakao-navigation";
import { KAKAO_NAVIGATION_COPY } from "@/lib/copy/generated/lib-auth-kakao-navigation";

export function KakaoExternalBrowserLauncher({
  redirectPath,
  autoLaunch,
}: {
  redirectPath: string;
  autoLaunch: boolean;
}) {
  const startUrl = buildKakaoStartUrl(redirectPath);
  // hydration 직후 effect 전에도 죽은 링크가 되지 않도록 기존 OAuth fallback을 둔다.
  const [externalUrl, setExternalUrl] = useState(
    `${startUrl}&external_browser=1`,
  );

  useEffect(() => {
    setExternalUrl(buildKakaoOpenExternalUrl(window.location.origin, startUrl));
  }, [startUrl]);

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
          {KAKAO_NAVIGATION_COPY.EXTERNAL_BROWSER_NOTICE}
        </p>
        <a
          href={externalUrl}
          className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-bold text-primary-foreground"
          data-testid="kakao-external-browser-link"
        >
          {KAKAO_NAVIGATION_COPY.EXTERNAL_BROWSER_ACTION}
        </a>
        <a
          href={`${startUrl}&external_browser=1`}
          className="flex min-h-11 items-center justify-center font-semibold text-accent-foreground underline underline-offset-2"
          data-testid="kakao-external-fallback-link"
        >
          {KAKAO_NAVIGATION_COPY.FALLBACK_ACTION}
        </a>
      </section>
    </main>
  );
}
