"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

export function BookmarkButton({ action, saved, compact = false }: { action: () => Promise<{ saved: boolean }>; saved: boolean; compact?: boolean }) {
  const [active, setActive] = useState(saved);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const Icon = active ? BookmarkCheck : Bookmark;
  const toggle = () => {
    if (pending) return;
    const previous = active;
    setActive(!previous); setFailed(false);
    startTransition(async () => {
      try { const result = await action(); setActive(result.saved); }
      catch { setActive(previous); setFailed(true); }
    });
  };
  return <div>
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={active} aria-label={active ? "Remove saved project" : "Save project"} title={active ? "Saved project" : "Save project"} className={`${active ? "btn-secondary border-cyan/40 bg-cyan/10 text-cyan" : "btn-secondary"} ${compact ? "!px-3" : "gap-2"} disabled:opacity-70`}>
      <Icon size={17}/>{!compact && (active ? "Saved" : "Save project")}
    </button>
    {failed && <p className="mt-1 text-xs text-red-200">Could not update. Try again.</p>}
  </div>;
}
