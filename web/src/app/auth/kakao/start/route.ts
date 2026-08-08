// auth/kakao/start/route.ts — 카카오 OAuth 시작 (서버 경유)
// 보안 결함 수정 (Codex 2nd-pass 결함1 — 로그인 CSRF/세션 고정).
//
// 흐름:
//   LoginSheet → /auth/kakao/start?redirect={path}
//   ↓ (서버) nonce 생성 → httpOnly 쿠키 저장 → state = nonce.path
//   ↓ 302 → kauth.kakao.com/oauth/authorize?state={state}&...
//   ↓ 카카오 → /auth/kakao/callback?code=...&state=...
//   callback에서 쿠키 nonce와 state의 nonce를 대조(상수시간 비교)

import { NextRequest, NextResponse } from "next/server";
import {
  KAKAO_OAUTH_NONCE_COOKIE,
  buildOAuthState,
  generateOAuthNonce,
} from "@/lib/auth/kakao-state";
import { isSafeRedirectPath } from "@/lib/auth/redirect-path";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedRedirect = url.searchParams.get("redirect");
  const redirectPath = isSafeRedirectPath(requestedRedirect)
    ? requestedRedirect
    : "/onboarding";

  const kakaoClientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

  if (!kakaoClientId) {
    console.warn("[auth/kakao/start] NEXT_PUBLIC_KAKAO_REST_API_KEY 미설정");
    return NextResponse.redirect(
      new URL("/?auth_error=config_error", request.url),
    );
  }

  const nonce = generateOAuthNonce();
  const state = buildOAuthState(nonce, redirectPath);
  const callbackUri = `${appUrl}/auth/kakao/callback`;

  const kakaoAuthorizeUrl =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(kakaoClientId)}` +
    `&redirect_uri=${encodeURIComponent(callbackUri)}` +
    `&response_type=code` +
    // account_email은 비즈 앱 전환 후 복원 (미전환 앱은 권한 없음 → KOE205 방지)
    // phone_number/age_range: 동의 항목은 카카오 콘솔에서 필수/선택이 확정되며,
    // 코드상은 이 scope를 요청한 상태.
    // birthday는 승인됐지만 사용 기능이 없어 콘솔·scope 모두 미사용(최소수집).
    `&scope=profile_nickname,profile_image,phone_number,age_range` +
    `&state=${encodeURIComponent(state)}`;

  const response = NextResponse.redirect(kakaoAuthorizeUrl);

  response.cookies.set(KAKAO_OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10분 — OAuth 왕복 시간 충분, 장기 노출 최소화
  });

  return response;
}
