"use client";

// components/goal/WordmapViewTracker.tsx — 워드맵 풀뷰 마운트 시 GA4 wordmap_viewed 배선.
// page.tsx가 서버 컴포넌트라 클라이언트 트래커 패턴(0px, 렌더 없음)으로 분리.

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function WordmapViewTracker({ goalId }: { goalId: number }) {
  useEffect(() => {
    trackEvent("wordmap_viewed", { goal_id: String(goalId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
