"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KAKAO_NAVIGATION_COPY } from "@/lib/copy/generated/lib-auth-kakao-navigation";
import { KakaoExternalBrowserLauncher } from "../external/KakaoExternalBrowserLauncher";

const SESSION_CHECK_WINDOW_MS = 4_000;
const SESSION_CHECK_INTERVAL_MS = 400;

export function KakaoSessionPending({ redirectPath }: { redirectPath: string }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

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
    return (
      <KakaoExternalBrowserLauncher
        redirectPath={redirectPath}
        autoLaunch={false}
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
      </section>
    </main>
  );
}
