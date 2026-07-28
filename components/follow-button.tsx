import { Bell, BellOff, UserCheck, UserPlus } from "lucide-react";

export function FollowButton({
  action,
  following,
  kind,
  count,
  className = "btn-secondary gap-2"
}: {
  action: () => Promise<void>;
  following: boolean;
  kind: "creator" | "project" | "campaign";
  count?: number;
  className?: string;
}) {
  const isCampaign = kind === "campaign";
  const label = isCampaign
    ? following ? "Watching" : "Watch campaign"
    : following ? "Following" : kind === "creator" ? "Follow creator" : "Follow project";
  const Icon = isCampaign ? (following ? BellOff : Bell) : (following ? UserCheck : UserPlus);

  return (
    <form action={action}>
      <button type="submit" className={following ? `${className} border-lime/35 bg-lime/10 text-lime` : className} aria-pressed={following}>
        <Icon size={17} />
        {label}
        {typeof count === "number" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{count}</span>}
      </button>
    </form>
  );
}
