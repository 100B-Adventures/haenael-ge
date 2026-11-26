import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSafeRedirectPath } from "@/lib/auth/redirect-path";
import {
  buildExternalKakaoStartUrl,
  buildKakaoOpenExternalUrl,
  buildKakaoStartUrl,
  isKakaoTalkInAppBrowser,
} from "@/lib/auth/kakao-navigation";
import { KAKAO_NAVIGATION_COPY } from "@/lib/copy/generated/lib-auth-kakao-navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { KakaoSessionPending } from "./KakaoSessionPending";

export default async function KakaoSessionPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectPath = isSafeRedirectPath(params.redirect)
    ? params.redirect
    : "/onboarding";
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(redirectPath);

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://haenael-ge.vercel.app";
  const startUrl = buildKakaoStartUrl(redirectPath);
  const isKakaoInApp = isKakaoTalkInAppBrowser(userAgent);

  return (
    <KakaoSessionPending
      redirectPath={redirectPath}
      isKakaoInApp={isKakaoInApp}
      externalUrl={buildKakaoOpenExternalUrl(appOrigin, startUrl)}
      fallbackUrl={buildExternalKakaoStartUrl(appOrigin, startUrl)}
      deviceInstruction={
        /iPhone|iPad|iPod/i.test(userAgent)
          ? KAKAO_NAVIGATION_COPY.IOS_INSTRUCTION
          : KAKAO_NAVIGATION_COPY.ANDROID_INSTRUCTION
      }
    />
  );
}
