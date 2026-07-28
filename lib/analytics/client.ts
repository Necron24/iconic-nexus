"use client";

export type AnalyticsEventType = "impression" | "view" | "link_click" | "share" | "follow";
export type AnalyticsTargetType = "project" | "devlog" | "campaign" | "profile";

const VISITOR_KEY = "iconic_nexus_analytics_visitor";

function visitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function trafficSource() {
  if (!document.referrer) return "direct";
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin ? "iconic_nexus" : referrer.hostname.slice(0, 80);
  } catch {
    return "direct";
  }
}

export async function trackAnalyticsEvent(
  eventType: AnalyticsEventType,
  targetType: AnalyticsTargetType,
  targetId: string
) {
  if (navigator.doNotTrack === "1") return;
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        eventType,
        targetType,
        targetId,
        visitorId: visitorId(),
        source: trafficSource()
      })
    });
  } catch {
    // Analytics must never interrupt the user's workflow.
  }
}
