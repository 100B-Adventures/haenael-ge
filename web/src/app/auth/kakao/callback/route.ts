// auth/kakao/callback/route.ts — 카카오 커스텀 OAuth 콜백 → invoke('auth-kakao')
// 슬라이스 #1 scaffold stub. 실구현은 슬라이스 #3.

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // TODO(slice-3): URL에서 code 추출 → invoke('auth-kakao') → Supabase 세션 → 리다이렉트
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?auth_error=kakao_failed", request.url));
  }

  // 슬라이스 #3 에서 실구현
  return NextResponse.redirect(
    new URL("/?auth_error=not_implemented_slice3", request.url),
  );
}
