// lib/auth/signup-mark.ts — 방금 만든 계정의 로그인 콜백에 가입 표식 쿠키를 남긴다.
// 서버 콜백은 브라우저 픽셀을 부를 수 없어, 다음 화면의 SignupConversion 이 읽고 지운다.

import type { NextResponse } from "next/server";
import { SIGNUP_MARK_COOKIE } from "@/lib/analytics/conversions";

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;
// 초대 토큰 화면에서는 외부 분석을 시작할 수 없어 안전한 경로로 이동할 때까지 보존한다.
// 표식은 첫 안전 경로에서 즉시 지워지고, 그 경로가 없더라도 하루 뒤 만료된다.
const MARK_MAX_AGE_SECONDS = 24 * 60 * 60;

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
