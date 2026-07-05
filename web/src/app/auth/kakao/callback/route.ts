// auth/kakao/callback/route.ts — 카카오 커스텀 OAuth 콜백 Route Handler
// 슬라이스 #3 실구현.
//
// 흐름:
//   카카오 → /auth/kakao/callback?code={code}&state={redirectTo}
//   ↓
//   EF `auth-kakao` 호출: code + redirect_uri → hashed_token
//   ↓
//   supabase.auth.verifyOtp({ token_hash, type: 'email' }) → 세션 쿠키 세팅
//   ↓
//   redirect → state 또는 /home
//
// state 파라미터: LoginSheet 에서 로그인 후 돌아올 경로를 인코딩 (e.g., '/onboarding')
//
// 에러 처리: 모든 실패 → /?auth_error={code} 로 리다이렉트 (dead-end 0 원칙)

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

// 허용된 리다이렉트 경로 (open-redirect 방지)
function isSafeRedirectPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes(":")
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const state = url.searchParams.get("state");

  // open-redirect 방지: state 는 /로 시작하는 내부 경로만
  const redirectTo = isSafeRedirectPath(state) ? state : "/home";

  // 카카오가 에러를 반환한 경우 (예: 사용자 취소)
  if (error || !code) {
    const reason = error === "access_denied" ? "cancelled" : "kakao_failed";
    console.warn(`[auth/kakao/callback] Kakao error: ${error} — ${errorDescription}`);
    return NextResponse.redirect(
      new URL(`/?auth_error=${reason}`, request.url),
    );
  }

  // ─── EF auth-kakao 호출 ───────────────────────────────────────────────────

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!supabaseUrl || !anonKey || !appUrl) {
    console.error("[auth/kakao/callback] missing env vars");
    return NextResponse.redirect(new URL("/?auth_error=config_error", request.url));
  }

  const callbackUri = `${appUrl}/auth/kakao/callback`;

  let efData: { hashed_token?: string; type?: string; error?: { code: string; message: string } };

  try {
    const efResponse = await fetch(`${supabaseUrl}/functions/v1/auth-kakao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // anon key: auth-kakao EF는 공개 엔드포인트(🔓)
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ code, redirect_uri: callbackUri }),
    });

    efData = await efResponse.json();

    if (!efResponse.ok) {
      const errCode = efData?.error?.code ?? "ef_error";
      console.error(`[auth/kakao/callback] EF error (${efResponse.status}):`, efData);
      return NextResponse.redirect(
        new URL(`/?auth_error=${errCode}`, request.url),
      );
    }
  } catch (networkErr) {
    console.error("[auth/kakao/callback] EF network error:", networkErr);
    return NextResponse.redirect(
      new URL("/?auth_error=ef_network_error", request.url),
    );
  }

  if (!efData?.hashed_token || !efData?.type) {
    console.error("[auth/kakao/callback] EF missing hashed_token:", efData);
    return NextResponse.redirect(
      new URL("/?auth_error=missing_token", request.url),
    );
  }

  // ─── Supabase 세션 확립 ───────────────────────────────────────────────────
  // verifyOtp 로 magic link token을 세션으로 교환.
  // createRouteHandlerClient 는 response.cookies 에 직접 세팅하므로
  // redirect response 에 세션 쿠키가 포함된다.

  const successResponse = NextResponse.redirect(
    new URL(redirectTo, request.url),
  );

  const supabase = createRouteHandlerClient(request, successResponse);

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: efData.hashed_token,
    type: efData.type as "email",
  });

  if (verifyError) {
    console.error("[auth/kakao/callback] verifyOtp error:", verifyError);
    return NextResponse.redirect(
      new URL("/?auth_error=session_failed", request.url),
    );
  }

  // 세션 쿠키가 successResponse.cookies 에 세팅된 상태로 리다이렉트
  return successResponse;
}
