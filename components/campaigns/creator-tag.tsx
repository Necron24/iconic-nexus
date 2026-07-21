import Link from "next/link";
import { BadgeCheck, UserRound } from "lucide-react";

type CreatorTagProps = {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role?: string | null;
  compact?: boolean;
  className?: string;
};

function creatorLabel(role?: string | null) {
  const value = role?.trim();
  if (!value) return "Developer";
  return value;
}

export function CreatorTag({
  username,
  displayName,
  avatarUrl,
  role,
  compact = false,
  className = ""
}: CreatorTagProps) {
  const name = displayName?.trim() || username?.trim() || "Iconic Nexus creator";
  const label = creatorLabel(role);
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-[0_0_18px_rgba(87,230,255,.12)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound size={17} className="text-cyan" aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0">
        {!compact && <span className="block text-[10px] font-bold uppercase tracking-[.18em] text-white/45">Created by</span>}
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-black text-white">{name}</span>
          <BadgeCheck size={15} className="shrink-0 text-cyan" aria-hidden="true" />
        </span>
        {!compact && username && <span className="block truncate text-xs text-white/50">@{username}</span>}
      </span>

      <span className="ml-auto shrink-0 rounded-full border border-cyan/20 bg-cyan/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-cyan">
        {label}
      </span>
    </>
  );

  const classes = [
    "inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-white/15",
    "bg-white/[0.07] px-3 py-2 backdrop-blur-xl",
    "shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_14px_40px_rgba(0,0,0,.22)]",
    "transition hover:-translate-y-0.5 hover:border-cyan/35 hover:bg-white/[0.1] hover:shadow-[0_16px_44px_rgba(87,230,255,.12)]",
    className
  ].join(" ");

  if (!username) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <Link href={`/profiles/${encodeURIComponent(username)}`} className={classes} aria-label={`View ${name}'s profile`}>
      {content}
    </Link>
  );
}
