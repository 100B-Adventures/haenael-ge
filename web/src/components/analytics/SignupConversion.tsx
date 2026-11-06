"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isSensitiveAnalyticsPath } from "@/lib/analytics";
import { SIGNUP_MARK_COOKIE, trackSignUpConversion } from "@/lib/analytics/conversions";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

/** 로그인 콜백이 남긴 가입 표식을 안전한 URL에서 한 번 보내고 지운다. */
export function SignupConversion() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();

  useEffect(() => {
    // OAuth가 초대 URL로 복귀하면 토큰이 pathname에 남아 있다. 이 화면에서는 외부
    // 분석 스크립트를 시작하지 않고 표식을 보존해 다음 안전한 화면에서 처리한다.
    if (consent !== "granted" || isSensitiveAnalyticsPath(pathname)) return;
    const prefix = `${SIGNUP_MARK_COOKIE}=`;
    const mark = document.cookie.split("; ").find((part) => part.startsWith(prefix));
    if (!mark) return;
    void trackSignUpConversion(decodeURIComponent(mark.slice(prefix.length))).then((sent) => {
      if (sent) {
        document.cookie = `${SIGNUP_MARK_COOKIE}=; path=/; max-age=0; samesite=lax; secure`;
      }
    });
  }, [consent, pathname]);
  return null;
}
