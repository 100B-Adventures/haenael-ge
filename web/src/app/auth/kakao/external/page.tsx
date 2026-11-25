import { isSafeRedirectPath } from "@/lib/auth/redirect-path";
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
  return (
    <KakaoExternalBrowserLauncher
      redirectPath={redirectPath}
      autoLaunch={params.auto !== "0"}
    />
  );
}
