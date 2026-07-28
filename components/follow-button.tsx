"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, UserCheck, UserPlus } from "lucide-react";

export function FollowButton({
  action,
  following,
  kind,
  count,
  className = "btn-secondary gap-2"
}: {
  action: () => Promise<{ following: boolean }>;
  following: boolean;
  kind: "creator" | "project" | "campaign";
  count?: number;
  className?: string;
}) {
  const [active, setActive] = useState(following);
  const [visibleCount, setVisibleCount] = useState(count);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const isCampaign = kind === "campaign";
  const label = isCampaign
    ? active ? "Watching" : "Watch campaign"
    : active ? "Following" : kind === "creator" ? "Follow creator" : "Follow project";
  const Icon = isCampaign ? (active ? BellOff : Bell) : (active ? UserCheck : UserPlus);

  function toggle() {
    if (pending) return;
    const previous = active;
    const previousCount = visibleCount;
    const optimistic = !previous;
    setFailed(false);
    setActive(optimistic);
    if (typeof previousCount === "number") {
      setVisibleCount(Math.max(0, previousCount + (optimistic ? 1 : -1)));
    }

    startTransition(async () => {
      try {
        const result = await action();
        setActive(result.following);
        if (typeof previousCount === "number" && result.following !== optimistic) {
          setVisibleCount(previousCount);
        }
      } catch {
        setActive(previous);
        setVisibleCount(previousCount);
        setFailed(true);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`${active ? `${className} border-lime/35 bg-lime/10 text-lime` : className} disabled:cursor-wait disabled:opacity-75`}
        aria-pressed={active}
        aria-busy={pending}
      >
        <Icon size={17} />
        {label}
        {typeof visibleCount === "number" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{visibleCount}</span>}
      </button>
      {failed && <p className="mt-1 text-xs text-red-200" role="status">Could not update. Please try again.</p>}
    </div>
  );
}
