"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { trackAnalyticsEvent, type AnalyticsTargetType } from "@/lib/analytics/client";

export function ShareButton({
  title,
  text,
  path,
  className = "btn-secondary gap-2",
  analyticsTargetType,
  analyticsTargetId
}: {
  title: string;
  text?: string;
  path?: string;
  className?: string;
  analyticsTargetType?: AnalyticsTargetType;
  analyticsTargetId?: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    const recordShare = () => {
      if (analyticsTargetType && analyticsTargetId) {
        void trackAnalyticsEvent("share", analyticsTargetType, analyticsTargetId);
      }
    };
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        recordShare();
        return;
      }
      await navigator.clipboard.writeText(url);
      recordShare();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        recordShare();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        // The browser may block clipboard access. Leave the page unchanged.
      }
    }
  };

  return (
    <button type="button" onClick={share} className={className} aria-label={`Share ${title}`}>
      {copied ? <Check size={17} /> : <Share2 size={17} />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
