"use client";

import { useEffect } from "react";
import { SIGNUP_MARK_COOKIE, trackSignUpConversion } from "@/lib/analytics/conversions";

/** 로그인 콜백이 남긴 가입 표식을 읽어 전환을 한 번 보내고 지운다. */
export function SignupConversion() {
  useEffect(() => {
    const prefix = `${SIGNUP_MARK_COOKIE}=`;
    const mark = document.cookie.split("; ").find((part) => part.startsWith(prefix));
    if (!mark) return;
    document.cookie = `${SIGNUP_MARK_COOKIE}=; path=/; max-age=0; samesite=lax; secure`;
    trackSignUpConversion(decodeURIComponent(mark.slice(prefix.length)));
  }, []);
  return null;
}
