// lib/auth/signup-mark.ts — 로그인 콜백에 가입·로그인 표식 쿠키를 남긴다.
// 서버 콜백은 브라우저 분석 함수를 부를 수 없어 다음 안전한 화면이 읽고 지운다.

import type { NextResponse } from "next/server";
import { LOGIN_MARK_COOKIE, SIGNUP_MARK_COOKIE } from "@/lib/analytics/conversions";

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;
// 초대 토큰 화면에서는 외부 분석을 시작할 수 없어 안전한 경로로 이동할 때까지 보존한다.
// 표식은 첫 안전 경로에서 즉시 지워지고, 그 경로가 없더라도 하루 뒤 만료된다.
const MARK_MAX_AGE_SECONDS = 24 * 60 * 60;

export function markAuthConversion(
  response: NextResponse,
  user: { id: string; created_at?: string } | null | undefined,
  now = Date.now(),
): void {
  if (!user) return;
  const createdAt = user.created_at ? new Date(user.created_at).getTime() : Number.NaN;
  const age = now - createdAt;
  const isNewAccount = Number.isFinite(age) && age >= 0 && age <= NEW_ACCOUNT_WINDOW_MS;
  response.cookies.set(
    isNewAccount ? SIGNUP_MARK_COOKIE : LOGIN_MARK_COOKIE,
    isNewAccount ? user.id : "oauth",
    {
      path: "/",
      maxAge: MARK_MAX_AGE_SECONDS,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    },
  );
}
