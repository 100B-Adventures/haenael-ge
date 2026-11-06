"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { trackPurchaseConversion } from "@/lib/analytics/conversions";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";

export type ConversionLease = {
  leaseToken: string;
  eventId: string;
  expiresAt: string;
};

async function conversionAction(body: Record<string, unknown>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/toss-confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

type ConversionDelivery =
  | { state: "leased"; lease: ConversionLease }
  | { state: "pending"; retryAt: string | null }
  | { state: "sent" }
  | { state: "unavailable" };

async function renewLease(orderId: string, paymentKey: string): Promise<ConversionDelivery> {
  const body = await conversionAction({ action: "lease_conversion", orderId, paymentKey });
  const delivery = body?.conversionDelivery as ConversionDelivery | undefined;
  return delivery ?? { state: "unavailable" };
}

/**
 * 브라우저 provider 호출은 전송 receipt를 제공하지 않는다. 따라서 로컬 큐 적재 뒤 DB를 ack하지 않고,
 * lease 만료 뒤 같은 eventId로 재시도한다(at-least-once transport + provider dedupe).
 */
export function PurchaseConversion({
  orderId,
  paymentKey,
  value,
  cleanPath,
  initialLease,
}: {
  orderId: string;
  paymentKey: string;
  value: number;
  cleanPath: string;
  initialLease: ConversionLease;
}) {
  const consent = useAnalyticsConsent();
  const attemptedTokens = useRef(new Set<string>());
  const retryTimer = useRef<number | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);

  const scheduleRetry = useCallback((delayMs: number) => {
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    retryTimer.current = window.setTimeout(() => {
      retryTimer.current = null;
      setRetryVersion((version) => version + 1);
    }, delayMs);
  }, []);

  const scheduleAfterLease = useCallback((lease: ConversionLease) => {
    const retryAfterLease = Math.max(1_000, Date.parse(lease.expiresAt) - Date.now() + 250);
    scheduleRetry(Math.min(retryAfterLease, 300_000));
  }, [scheduleRetry]);

  useEffect(() => {
    window.history.replaceState(window.history.state, "", cleanPath);
  }, [cleanPath]);

  useEffect(
    () => () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (consent !== "granted") return;

    const deliver = async () => {
      let lease = initialLease;
      try {
        if (Date.parse(lease.expiresAt) <= Date.now()) {
          const renewed = await renewLease(orderId, paymentKey);
          if (renewed.state === "sent") return;
          if (renewed.state !== "leased") {
            const retryAt = renewed.state === "pending" ? Date.parse(renewed.retryAt ?? "") : NaN;
            const delay = Number.isFinite(retryAt)
              ? Math.max(1_000, retryAt - Date.now() + 250)
              : 5_000;
            scheduleRetry(Math.min(delay, 300_000));
            return;
          }
          lease = renewed.lease;
        }
        if (attemptedTokens.current.has(lease.leaseToken)) {
          scheduleAfterLease(lease);
          return;
        }
        attemptedTokens.current.add(lease.leaseToken);

        trackEvent("payment_success", {
          event_id: lease.eventId,
          value,
          currency: "KRW",
        });
        const acceptedByLocalQueues = await trackPurchaseConversion(orderId, value, lease.eventId);
        if (!acceptedByLocalQueues) attemptedTokens.current.delete(lease.leaseToken);

        // gtag/fbq 호출 성공은 provider transport receipt가 아니다. 브라우저에서는 sent ack를 금지한다.
        scheduleAfterLease(lease);
      } catch {
        attemptedTokens.current.delete(lease.leaseToken);
        scheduleAfterLease(lease);
      }
    };

    void deliver();
  }, [consent, initialLease, orderId, paymentKey, retryVersion, scheduleAfterLease, scheduleRetry, value]);

  return null;
}
