"use client";

import Script from "next/script";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type WidgetStatus = "loading" | "ready" | "verified" | "error";

export function TurnstileWidget({ action }: { action: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const id = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<WidgetStatus>("loading");

  const tokenInput = useCallback(() => document.getElementById(`${id}-token`) as HTMLInputElement | null, [id]);
  const clearToken = useCallback(() => { const input = tokenInput(); if (input) input.value = ""; }, [tokenInput]);

  const removeWidget = useCallback(() => {
    if (widgetId.current && window.turnstile) {
      try { window.turnstile.remove(widgetId.current); } catch { /* widget may already be gone */ }
    }
    widgetId.current = null;
    clearToken();
  }, [clearToken]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || widgetId.current || !window.turnstile) return false;
    setStatus("ready");
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
        const input = tokenInput();
        if (input) input.value = token;
        setStatus("verified");
      },
      "expired-callback"() {
        clearToken();
        setStatus("ready");
      },
      "timeout-callback"() {
        clearToken();
        setStatus("error");
      },
      "error-callback"() {
        clearToken();
        setStatus("error");
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          removeWidget();
          renderWidget();
        }, 2500);
        return true;
      }
    });
    return true;
  }, [action, clearToken, removeWidget, siteKey, tokenInput]);

  const retry = useCallback(() => {
    setStatus("loading");
    removeWidget();
    if (!renderWidget()) {
      retryTimer.current = setTimeout(renderWidget, 600);
    }
  }, [removeWidget, renderWidget]);

  useEffect(() => {
    if (renderWidget()) return;
    pollTimer.current = setInterval(() => {
      if (renderWidget() && pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    }, 350);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      removeWidget();
    };
  }, [removeWidget, renderWidget]);

  if (!siteKey) {
    return process.env.NODE_ENV === "development" ? (
      <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs text-amber-100">CAPTCHA is disabled locally because no Turnstile site key is configured.</p>
    ) : (
      <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200">Security verification is temporarily unavailable.</p>
    );
  }

  return (
    <div className="space-y-2">
      <Script id="cloudflare-turnstile-script" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => { renderWidget(); }} onReady={() => { renderWidget(); }} />
      <input id={`${id}-token`} type="hidden" name="turnstileToken" />
      <div ref={containerRef} className="min-h-[65px] w-full overflow-hidden rounded-xl" />
      <div className="flex items-center justify-between gap-3 text-xs text-soft">
        <span className="flex items-center gap-2"><ShieldCheck size={14} className={status === "verified" ? "text-lime" : "text-cyan"} />{status === "verified" ? "Security check complete." : status === "error" ? "Cloudflare could not finish the check." : "Protected by Cloudflare Turnstile."}</span>
        {status === "error" && <button type="button" onClick={retry} className="inline-flex items-center gap-1 font-bold text-cyan hover:text-white"><RefreshCw size={13} /> Retry</button>}
      </div>
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
