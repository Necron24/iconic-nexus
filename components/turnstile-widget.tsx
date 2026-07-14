"use client";

import Script from "next/script";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export function TurnstileWidget({ action }: { action: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const id = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  const clearToken = useCallback(() => {
    const input = document.getElementById(`${id}-token`) as HTMLInputElement | null;
    if (input) input.value = "";
  }, [id]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || widgetId.current || !window.turnstile) return;

    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme: "dark",
      size: "flexible",
      retry: "auto",
      "retry-interval": 3000,
      "refresh-expired": "auto",
      "refresh-timeout": "auto",
      callback(token: string) {
        const input = document.getElementById(`${id}-token`) as HTMLInputElement | null;
        if (input) input.value = token;
      },
      "expired-callback"() {
        clearToken();
      },
      "timeout-callback"() {
        clearToken();
      },
      "error-callback"() {
        clearToken();
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          if (widgetId.current && window.turnstile) {
            window.turnstile.reset(widgetId.current);
          }
        }, 1500);
        return true;
      }
    });
  }, [action, clearToken, id, siteKey]);

  useEffect(() => {
    if (window.turnstile) setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    renderWidget();

    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      clearToken();
    };
  }, [clearToken, ready, renderWidget]);

  if (!siteKey) {
    return process.env.NODE_ENV === "development" ? (
      <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">CAPTCHA is disabled locally because no Turnstile site key is configured.</p>
    ) : (
      <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200">Security verification is temporarily unavailable.</p>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        id="cloudflare-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onReady={() => setReady(true)}
      />
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
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}
