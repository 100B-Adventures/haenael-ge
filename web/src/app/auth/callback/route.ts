// auth/callback/route.ts — Supabase 네이티브 OAuth 콜백 (구글/애플)
// api-contract A1b: `supabase.auth.signInWithOAuth(google/apple)` — 카카오(EF 커스텀)와
// 달리 구글/애플은 Supabase Auth가 provider 왕복을 전담하고, 우리 앱은
// PKCE code만 세션으로 교환(exchangeCodeForSession)하면 된다.
//
// 흐름:
//   LoginSheet → supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
//   ↓ (Supabase가 구글/애플 동의화면으로 리다이렉트, redirectTo에 next 경로를 실어보냄)
//   구글/애플 → Supabase Auth → /auth/callback?code={code}&next={path}
//   ↓
//   exchangeCodeForSession(code) → 세션 쿠키 세팅 (route-handler client가 response에 바인딩)
//   ↓
//   redirect → next 또는 /me
//
// 에러 처리: 모든 실패 → /?auth_error={code} 로 리다이렉트 (카카오 콜백과 동일한 dead-end 0 원칙)

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isSafeRedirectPath } from "@/lib/auth/redirect-path";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const requestedNext = url.searchParams.get("next");

  const redirectTo = isSafeRedirectPath(requestedNext) ? requestedNext : "/onboarding";

  // 구글/애플이 동의화면에서 에러를 반환한 경우 (예: 사용자 취소, provider 설정 오류)
  if (error || !code) {
    const reason = error === "access_denied" ? "cancelled" : "oauth_failed";
    console.warn(`[auth/callback] provider error: ${error} — ${errorDescription}`);
    return NextResponse.redirect(new URL(`/?auth_error=${reason}`, request.url));
  }

  const successResponse = NextResponse.redirect(new URL(redirectTo, request.url));
  const supabase = createRouteHandlerClient(request, successResponse);

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession error:", exchangeError);
    // provider가 Supabase 대시보드에서 미활성화된 경우도 이 경로로 옴
    // (예: "Unsupported provider" / "provider is not enabled")
    return NextResponse.redirect(new URL("/?auth_error=session_failed", request.url));
  }

  return successResponse;
}
