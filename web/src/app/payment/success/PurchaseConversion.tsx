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
  const response = await fetch(`${supabaseUrl}/functions/v1/toss-confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
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

async function acknowledgeLease(
  orderId: string,
  paymentKey: string,
  lease: ConversionLease,
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const body = await conversionAction({
      action: "ack_conversion",
      orderId,
      paymentKey,
      leaseToken: lease.leaseToken,
      eventId: lease.eventId,
    });
    if (body?.acknowledged === true) return true;
    if (attempt < 2) {
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  return false;
}

/** 안전한 URL 교체 후 동의 상태에서 provider enqueue → durable ack 순서로 Purchase를 보낸다. */
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
      if (attemptedTokens.current.has(lease.leaseToken)) return;
      attemptedTokens.current.add(lease.leaseToken);

      trackEvent("payment_success", {
        event_id: lease.eventId,
        value,
        currency: "KRW",
      });
      const queued = await trackPurchaseConversion(orderId, value, lease.eventId);
      if (!queued) {
        attemptedTokens.current.delete(lease.leaseToken);
        scheduleRetry(5_000);
        return;
      }
      const acknowledged = await acknowledgeLease(orderId, paymentKey, lease);
      if (!acknowledged) {
        attemptedTokens.current.delete(lease.leaseToken);
        const retryAfterLease = Math.max(1_000, Date.parse(lease.expiresAt) - Date.now() + 250);
        scheduleRetry(Math.min(retryAfterLease, 300_000));
      }
    };

    void deliver();
  }, [consent, initialLease, orderId, paymentKey, retryVersion, scheduleRetry, value]);

  return null;
}
