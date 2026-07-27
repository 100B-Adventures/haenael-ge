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
//   redirect → state 또는 /me
//
// state 파라미터: LoginSheet 에서 로그인 후 돌아올 경로를 인코딩 (e.g., '/onboarding')
//
// 에러 처리: 모든 실패 → /?auth_error={code} 로 리다이렉트 (dead-end 0 원칙)

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import {
  KAKAO_OAUTH_NONCE_COOKIE,
  parseOAuthState,
  timingSafeEqualString,
} from "@/lib/auth/kakao-state";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const state = url.searchParams.get("state");

  // 보안 결함1 수정 (로그인 CSRF/세션 고정): state = nonce.path 로 파싱하고
  // httpOnly 쿠키의 nonce와 상수시간 비교로 대조한다. 대조 후(성공/실패
  // 무관) 쿠키는 항상 삭제한다 — 재사용 방지.
  const cookieNonce = request.cookies.get(KAKAO_OAUTH_NONCE_COOKIE)?.value;
  const parsedState = parseOAuthState(state);

  const nonceValid =
    !!cookieNonce &&
    !!parsedState &&
    timingSafeEqualString(cookieNonce, parsedState.nonce);

  if (!nonceValid) {
    console.warn("[auth/kakao/callback] state nonce 불일치 — CSRF/재사용 의심");
    const invalidStateResponse = NextResponse.redirect(
      new URL("/?auth_error=invalid_state", request.url),
    );
    invalidStateResponse.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);
    return invalidStateResponse;
  }

  const redirectTo = parsedState.redirectPath;

  // 카카오가 에러를 반환한 경우 (예: 사용자 취소)
  if (error || !code) {
    const reason = error === "access_denied" ? "cancelled" : "kakao_failed";
    console.warn(`[auth/kakao/callback] Kakao error: ${error} — ${errorDescription}`);
    const errResponse = NextResponse.redirect(
      new URL(`/?auth_error=${reason}`, request.url),
    );
    errResponse.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);
    return errResponse;
  }

  // ─── EF auth-kakao 호출 ───────────────────────────────────────────────────

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!supabaseUrl || !anonKey || !appUrl) {
    console.error("[auth/kakao/callback] missing env vars");
    const response = NextResponse.redirect(new URL("/?auth_error=config_error", request.url));
    response.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);
    return response;
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
      const response = NextResponse.redirect(
        new URL(`/?auth_error=${errCode}`, request.url),
      );
      response.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);
      return response;
    }
  } catch (networkErr) {
    console.error("[auth/kakao/callback] EF network error:", networkErr);
    const response = NextResponse.redirect(
      new URL("/?auth_error=ef_network_error", request.url),
    );
    response.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);
    return response;
  }

  if (!efData?.hashed_token || !efData?.type) {
    console.error("[auth/kakao/callback] EF missing hashed_token:", efData);
    const response = NextResponse.redirect(
      new URL("/?auth_error=missing_token", request.url),
    );
    response.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);
    return response;
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
    const response = NextResponse.redirect(
      new URL("/?auth_error=session_failed", request.url),
    );
    response.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);
    return response;
  }

  // nonce는 1회용 — 성공 경로에서도 삭제(재사용 방지)
  successResponse.cookies.delete(KAKAO_OAUTH_NONCE_COOKIE);

  // 세션 쿠키가 successResponse.cookies 에 세팅된 상태로 리다이렉트
  return successResponse;
}
