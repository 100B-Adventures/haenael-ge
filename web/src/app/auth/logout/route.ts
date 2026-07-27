// auth/logout/route.ts — 로그아웃 Route Handler
// 회장 지적 갭 보완: MVP에 로그아웃 UI·경로가 없었음.
//
// 흐름:
//   POST /auth/logout (LogoutButton fetch)
//   ↓
//   supabase.auth.signOut() — 서버측 세션 무효화 + 세션 쿠키 제거
//   ↓
//   NextResponse.redirect("/") — 랜딩으로
//
// route-handler.ts 패턴 재사용(auth/kakao/callback/route.ts와 동일):
// response.cookies 에 직접 바인딩된 supabase 클라이언트로 signOut 하면
// Supabase SSR이 세션 쿠키 삭제(setAll → maxAge 0)를 response에 반영한다.
//
// GET도 허용: <a href="/auth/logout"> 같은 단순 링크 fallback 지원.
// (사이드이펙트가 있는 GET이지만, 로그아웃은 멱등이고 CSRF로 악용해도
// "로그아웃시키는" 것 외 피해가 없어 다른 서비스들도 흔히 허용하는 절충.)

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

async function handleLogout(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  const supabase = createRouteHandlerClient(request, response);

  // scope: 'global' — 이 계정의 모든 세션/리프레시토큰을 무효화한다(견고성 갭D,
  // 2026-07-20). 기본(scope 미지정=local)은 현재 브라우저 세션만 지우고 다른
  // 기기의 refresh token은 살아있는다 — 로그아웃 의도(전체 로그아웃)와 불일치.
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    // 세션이 이미 없는 등 signOut 실패해도 랜딩으로는 보낸다(dead-end 0 원칙).
    // 에러 로깅 강화: 코드/상태까지 남겨 운영 중 실패 패턴 추적 가능하게.
    console.error("[auth/logout] signOut error:", {
      message: error.message,
      status: (error as { status?: number }).status,
      name: error.name,
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}
