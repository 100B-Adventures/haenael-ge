"use client";

// components/goal/HomeSeenTracker.tsx — /me 마운트 시 "마지막 방문 시각"을 localStorage에 갱신.
// OwnerBar(/g/[slug])의 "새 응원 N개" 계산 기준선. page.tsx가 서버 컴포넌트라 트래커 패턴으로 분리
// (WordmapViewTracker와 동일 패턴).

import { useEffect } from "react";
import { HOME_LAST_SEEN_KEY } from "@/lib/home-seen";

export function HomeSeenTracker() {
  useEffect(() => {
    try {
      window.localStorage.setItem(HOME_LAST_SEEN_KEY, String(Date.now()));
    } catch {
      // localStorage 불가 환경(프라이빗 모드 등) — 배지 정확도만 저하, 기능은 유지
    }
  }, []);

  return null;
}
