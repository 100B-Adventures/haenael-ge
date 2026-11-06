"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { trackPurchaseConversion } from "@/lib/analytics/conversions";

/**
 * 결제 승인 뒤 주소 기록을 안전한 복귀 경로로 바꾸고 Purchase 를 보낸다.
 * 새로고침하면 공개 플래그로 성공 화면을 재현하지 않고 복귀 경로를 연다.
 */
export function PurchaseConversion({
  orderId,
  value,
  cleanPath,
}: {
  orderId: string;
  value: number;
  cleanPath: string;
}) {
  useEffect(() => {
    window.history.replaceState(window.history.state, "", cleanPath);
    trackEvent("payment_success", { value, currency: "KRW" });
    trackPurchaseConversion(orderId, value);
  }, [orderId, value, cleanPath]);
  return null;
}
