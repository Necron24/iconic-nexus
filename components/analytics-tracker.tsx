"use client";

import { useEffect, useRef } from "react";
import {
  trackAnalyticsEvent,
  type AnalyticsEventType,
  type AnalyticsTargetType
} from "@/lib/analytics/client";

export function AnalyticsTracker({
  eventType,
  targetType,
  targetId,
  impressionThreshold = 0.55
}: {
  eventType: AnalyticsEventType;
  targetType: AnalyticsTargetType;
  targetId: string;
  impressionThreshold?: number;
}) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (eventType === "view") {
      void trackAnalyticsEvent(eventType, targetType, targetId);
      return;
    }

    const node = marker.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= impressionThreshold)) {
        void trackAnalyticsEvent(eventType, targetType, targetId);
        observer.disconnect();
      }
    }, { threshold: impressionThreshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [eventType, impressionThreshold, targetId, targetType]);

  return <span ref={marker} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}
