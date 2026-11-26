import { headers } from "next/headers";
import { isSafeRedirectPath } from "@/lib/auth/redirect-path";
import {
  buildExternalKakaoStartUrl,
  buildKakaoOpenExternalUrl,
  buildKakaoStartUrl,
} from "@/lib/auth/kakao-navigation";
import { KAKAO_NAVIGATION_COPY } from "@/lib/copy/generated/lib-auth-kakao-navigation";
import { KakaoExternalBrowserLauncher } from "./KakaoExternalBrowserLauncher";

export default async function KakaoExternalBrowserPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; auto?: string }>;
}) {
  const params = await searchParams;
  const redirectPath = isSafeRedirectPath(params.redirect)
    ? params.redirect
    : "/onboarding";
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "https://haenael-ge.vercel.app";
  const startUrl = buildKakaoStartUrl(redirectPath);
  return (
    <KakaoExternalBrowserLauncher
      redirectPath={redirectPath}
      autoLaunch={params.auto !== "0"}
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
