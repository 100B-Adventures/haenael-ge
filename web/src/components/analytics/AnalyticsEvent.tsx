"use client";

import { useEffect, useRef } from "react";
import { HaenaelEvent, trackEvent } from "@/lib/analytics";

export function AnalyticsEvent({ event, params }: { event: HaenaelEvent; params?: Record<string, unknown> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackEvent(event, params);
  }, [event, params]);
  return null;
}

