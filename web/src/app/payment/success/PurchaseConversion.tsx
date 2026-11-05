"use client";

import { useEffect } from "react";
import { trackPurchaseConversion } from "@/lib/analytics/conversions";

/**
 * 결제 승인 뒤 주소에서 paymentKey 를 지우고 Purchase 를 보낸다.
 * 광고 픽셀은 현재 주소 전체를 매체로 보내므로, 지운 뒤에 보내야 결제 키가 나가지 않는다.
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
    trackPurchaseConversion(orderId, value);
  }, [orderId, value, cleanPath]);
  return null;
}
