import {
  Apple,
  AppWindow,
  CircleDot,
  Gamepad2,
  Globe2,
  Laptop,
  Monitor,
  Rocket,
  Smartphone,
  TestTube2,
  Wrench
} from "lucide-react";

const platformConfig = [
  { match: /android/i, label: "Android", Icon: Smartphone, className: "border-[#3DDC84]/35 bg-[#3DDC84]/10 text-[#70f0ad]" },
  { match: /\bios\b|iphone|ipad|macos|apple/i, label: "iOS", Icon: Apple, className: "border-white/25 bg-white/10 text-white" },
  { match: /windows|pc/i, label: "Windows", Icon: Monitor, className: "border-[#00A4EF]/35 bg-[#00A4EF]/10 text-[#69d2ff]" },
  { match: /web|browser|chrome/i, label: "Web", Icon: Globe2, className: "border-cyan/35 bg-cyan/10 text-cyan" },
  { match: /linux/i, label: "Linux", Icon: Laptop, className: "border-amber-300/35 bg-amber-300/10 text-amber-200" },
  { match: /xbox/i, label: "Xbox", Icon: Gamepad2, className: "border-lime/35 bg-lime/10 text-lime" },
  { match: /playstation|ps4|ps5/i, label: "PlayStation", Icon: Gamepad2, className: "border-blue-400/35 bg-blue-400/10 text-blue-200" },
  { match: /steam/i, label: "Steam", Icon: Gamepad2, className: "border-sky-300/35 bg-sky-300/10 text-sky-200" }
] as const;

const baseClass = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black";

function parts(platform: string) {
  const matched = platformConfig.filter((item) => item.match.test(platform));
  if (matched.length > 0) return matched;
  return [{ label: platform || "Other", Icon: AppWindow, className: "border-white/15 bg-white/5 text-soft" }];
}

export function PlatformBadges({ platform, compact = false }: { platform: string; compact?: boolean }) {
  return (
    <>
      {parts(platform).map(({ label, Icon, className }) => (
        <span key={label} className={`${baseClass} ${className} ${compact ? "!px-2.5 !py-1" : ""}`} title={`Platform: ${label}`}>
          <Icon size={compact ? 12 : 14} aria-hidden="true" />
          {label}
        </span>
      ))}
    </>
  );
}

const stageConfig: Record<string, { label: string; Icon: typeof CircleDot; className: string }> = {
  prototype: { label: "Prototype", Icon: Wrench, className: "border-violet-400/35 bg-violet-400/10 text-violet-200" },
  alpha: { label: "Alpha", Icon: CircleDot, className: "border-amber-300/35 bg-amber-300/10 text-amber-200" },
  beta: { label: "Beta", Icon: TestTube2, className: "border-cyan/35 bg-cyan/10 text-cyan" },
  released: { label: "Released", Icon: Rocket, className: "border-lime/35 bg-lime/10 text-lime" }
};

export function StageBadge({ stage, compact = false }: { stage: string; compact?: boolean }) {
  const config = stageConfig[stage.toLowerCase()] ?? { label: stage, Icon: CircleDot, className: "border-white/15 bg-white/5 text-soft" };
  return <span className={`${baseClass} ${config.className} ${compact ? "!px-2.5 !py-1" : ""}`} title={`Development stage: ${config.label}`}><config.Icon size={compact ? 12 : 14}/>{config.label}</span>;
}

export function ProjectTypeBadge({ type, compact = false }: { type: string; compact?: boolean }) {
  const isGame = type.toLowerCase() === "game";
  const Icon = isGame ? Gamepad2 : AppWindow;
  return <span className={`${baseClass} border-white/15 bg-white/[0.06] text-white/85 ${compact ? "!px-2.5 !py-1" : ""}`} title={`Project type: ${isGame ? "Game" : "App"}`}><Icon size={compact ? 12 : 14}/>{isGame ? "Game" : "App"}</span>;
}

const statusStyles: Record<string, string> = {
  active: "border-lime/35 bg-lime/10 text-lime",
  paused: "border-amber-300/35 bg-amber-300/10 text-amber-200",
  draft: "border-violet-400/35 bg-violet-400/10 text-violet-200",
  completed: "border-cyan/35 bg-cyan/10 text-cyan",
  cancelled: "border-red-400/35 bg-red-400/10 text-red-200"
};

export function CampaignStatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  return <span className={`${baseClass} capitalize ${statusStyles[status.toLowerCase()] ?? "border-white/15 bg-white/5 text-soft"}`}><CircleDot size={13}/>{label}</span>;
}
