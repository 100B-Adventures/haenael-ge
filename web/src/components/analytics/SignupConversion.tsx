"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isSensitiveAnalyticsPath } from "@/lib/analytics";
import {
  LOGIN_MARK_COOKIE,
  SIGNUP_MARK_COOKIE,
  trackLoginConversion,
  trackSignUpConversion,
} from "@/lib/analytics/conversions";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

function cookieValue(name: string): string | null {
  const prefix = `${name}=`;
  const mark = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return mark ? decodeURIComponent(mark.slice(prefix.length)) : null;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax; secure`;
}

/** 로그인 콜백이 남긴 가입·로그인 표식을 안전한 URL에서 한 번 보내고 지운다. */
export function SignupConversion() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();

  useEffect(() => {
    // OAuth가 초대 URL로 복귀하면 토큰이 pathname에 남아 있다. 이 화면에서는 외부
    // 분석 스크립트를 시작하지 않고 표식을 보존해 다음 안전한 화면에서 처리한다.
    if (consent !== "granted" || isSensitiveAnalyticsPath(pathname)) return;
    const signupMark = cookieValue(SIGNUP_MARK_COOKIE);
    if (signupMark) {
      void trackSignUpConversion(signupMark).then((sent) => {
        if (sent) clearCookie(SIGNUP_MARK_COOKIE);
      });
      return;
    }

    const loginMethod = cookieValue(LOGIN_MARK_COOKIE);
    if (!loginMethod) return;
    const sent = trackLoginConversion(loginMethod);
    if (sent) {
      clearCookie(LOGIN_MARK_COOKIE);
    }
  }, [consent, pathname]);
  return null;
}
