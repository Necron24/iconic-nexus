"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({
  title,
  text,
  path,
  className = "btn-secondary gap-2"
}: {
  title: string;
  text?: string;
  path?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
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
