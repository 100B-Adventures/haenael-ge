"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildKakaoStartUrl } from "@/lib/auth/kakao-navigation";
import { KAKAO_NAVIGATION_COPY } from "@/lib/copy/generated/lib-auth-kakao-navigation";
import { KakaoExternalBrowserLauncher } from "../external/KakaoExternalBrowserLauncher";

const SESSION_CHECK_WINDOW_MS = 4_000;
const SESSION_CHECK_INTERVAL_MS = 400;

interface KakaoSessionPendingProps {
  redirectPath: string;
  isKakaoInApp: boolean;
  externalUrl: string;
  fallbackUrl: string;
  deviceInstruction: string;
}

export function KakaoSessionPending({
  redirectPath,
  isKakaoInApp,
  externalUrl,
  fallbackUrl,
  deviceInstruction,
}: KakaoSessionPendingProps) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const startUrl = buildKakaoStartUrl(redirectPath);

  useEffect(() => {
    const supabase = createClient();
    const startedAt = Date.now();
    let active = true;
    let timer: number | undefined;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;
      if (!error && data.user) {
        router.replace(redirectPath);
        return;
      }
      if (Date.now() - startedAt >= SESSION_CHECK_WINDOW_MS) {
        setChecking(false);
        return;
      }
      timer = window.setTimeout(checkSession, SESSION_CHECK_INTERVAL_MS);
    };

    void checkSession();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [redirectPath, router]);

  if (!checking) {
    if (!isKakaoInApp) {
      return (
        <main className="min-h-svh bg-background px-[22px] py-10">
          <section className="mx-auto flex max-w-sm flex-col gap-4 rounded-md border border-border bg-card p-6 text-center">
            <p className="text-[length:var(--text-body)]! font-bold text-foreground" role="status">
              {KAKAO_NAVIGATION_COPY.SESSION_MISSING_BROWSER}
            </p>
            <a
              href={startUrl}
              className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-bold text-primary-foreground"
              data-testid="kakao-session-retry-link"
            >
              {KAKAO_NAVIGATION_COPY.SESSION_RETRY_ACTION}
            </a>
          </section>
        </main>
      );
    }

    return (
      <KakaoExternalBrowserLauncher
        redirectPath={redirectPath}
        autoLaunch={false}
        externalUrl={externalUrl}
        fallbackUrl={fallbackUrl}
        deviceInstruction={deviceInstruction}
        statusMessage={KAKAO_NAVIGATION_COPY.SESSION_MISSING}
      />
    );
  }

  return (
    <main className="min-h-svh bg-background px-[22px] py-10">
      <section className="mx-auto flex max-w-sm flex-col gap-4 rounded-md border border-border bg-card p-6 text-center">
        <p
          className="text-[length:var(--text-body)]! font-bold text-foreground"
          role="status"
          data-testid="kakao-session-checking"
        >
          {KAKAO_NAVIGATION_COPY.SESSION_CHECKING}
        </p>
        <noscript>
          <a
            href={startUrl}
            className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-bold text-primary-foreground"
            data-testid="kakao-pending-noscript-link"
          >
            {KAKAO_NAVIGATION_COPY.SESSION_RETRY_ACTION}
          </a>
        </noscript>
      </section>
    </main>
  );
}
