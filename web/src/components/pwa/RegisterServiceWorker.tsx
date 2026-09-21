"use client";

import { useEffect } from "react";

// 서비스 워커 등록. 화면을 그리지 않는다. 등록이 실패해도 앱은 그대로 돈다.
// 워커 자체는 public/sw.js 이고 캐시를 하지 않는다(그 파일 머리 주석 참고).
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] service worker 등록 실패", error);
    });
  }, []);
  return null;
}
