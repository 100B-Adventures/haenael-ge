// lib/auth/signup-mark.ts — 방금 만든 계정의 로그인 콜백에 가입 표식 쿠키를 남긴다.
// 서버 콜백은 브라우저 픽셀을 부를 수 없어, 다음 화면의 SignupConversion 이 읽고 지운다.

import type { NextResponse } from "next/server";
import { SIGNUP_MARK_COOKIE } from "@/lib/analytics/conversions";

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;
const MARK_MAX_AGE_SECONDS = 120;

export function markIfNewAccount(
  response: NextResponse,
  user: { id: string; created_at?: string } | null | undefined,
  now = Date.now(),
): void {
  if (!user?.created_at) return;
  const age = now - new Date(user.created_at).getTime();
  if (!(age >= 0 && age <= NEW_ACCOUNT_WINDOW_MS)) return;
  response.cookies.set(SIGNUP_MARK_COOKIE, user.id, {
    path: "/",
    maxAge: MARK_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
}
