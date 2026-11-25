import { isSafeRedirectPath } from "@/lib/auth/redirect-path";
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

  return <KakaoSessionPending redirectPath={redirectPath} />;
}
