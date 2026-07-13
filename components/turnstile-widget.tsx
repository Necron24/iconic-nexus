"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

export function TurnstileWidget({ action }: { action: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const id = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!siteKey || !ready || !containerRef.current || widgetId.current) return;
    const turnstile = window.turnstile;
    if (!turnstile) return;
    widgetId.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "dark",
      size: "flexible",
      callback(token: string) {
        const input = document.getElementById(`${id}-token`) as HTMLInputElement | null;
        if (input) input.value = token;
      },
      "expired-callback"() {
        const input = document.getElementById(`${id}-token`) as HTMLInputElement | null;
        if (input) input.value = "";
      },
      "error-callback"() {
        const input = document.getElementById(`${id}-token`) as HTMLInputElement | null;
        if (input) input.value = "";
      }
    });
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [action, id, ready, siteKey]);

  if (!siteKey) {
    return process.env.NODE_ENV === "development" ? (
      <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">CAPTCHA is disabled locally because no Turnstile site key is configured.</p>
    ) : (
      <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200">Security verification is temporarily unavailable.</p>
    );
  }

  return (
    <div className="space-y-2">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setReady(true)} />
      <input id={`${id}-token`} type="hidden" name="turnstileToken" />
      <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden rounded-xl" />
      <p className="text-xs text-soft">Protected by Cloudflare Turnstile.</p>
    </div>
  );
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}
