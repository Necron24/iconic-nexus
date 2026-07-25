import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  DEFAULT_DEVLOG_STYLE,
  bodyFontStacks,
  devlogBackground,
  headingFontStacks,
  type DevlogStyle
} from "@/lib/devlog-style";

type Devlog = DevlogStyle & {
  id: string;
  title: string;
  body: string;
  version_label?: string | null;
  update_type: string;
  image_url?: string | null;
  release_url?: string | null;
  published_at?: string | null;
  created_at: string;
};

const labels: Record<string, string> = {
  development: "Development update",
  release: "New release",
  bug_fixes: "Bug fixes",
  testing_needed: "Testing needed",
  major_update: "Major update",
  announcement: "Announcement"
};

export function DevlogCard({ update, showDetailLink = true }: { update: Devlog; showDetailLink?: boolean }) {
  const accent = update.accent_color ?? DEFAULT_DEVLOG_STYLE.accent_color;
  const layout = update.layout_style ?? DEFAULT_DEVLOG_STYLE.layout_style;
  const alignment = update.text_align ?? DEFAULT_DEVLOG_STYLE.text_align;
  const cardStyle = update.card_style ?? DEFAULT_DEVLOG_STYLE.card_style;
  const imageFit = update.image_fit ?? DEFAULT_DEVLOG_STYLE.image_fit;
  const headingFont = headingFontStacks[update.heading_font ?? "display"] ?? headingFontStacks.display;
  const bodyFont = bodyFontStacks[update.body_font ?? "sans"] ?? bodyFontStacks.sans;
  const cardClass = {
    glass: "border-white/15 bg-black/25 backdrop-blur-xl shadow-2xl",
    solid: "border-white/10 bg-[#0B1020] shadow-2xl",
    outline: "border-2 bg-transparent",
    minimal: "border-transparent bg-transparent"
  }[cardStyle] ?? "border-white/15 bg-black/25 backdrop-blur-xl shadow-2xl";

  return (
    <article className="overflow-hidden rounded-3xl p-3 sm:p-6" style={{ background: devlogBackground(update) }}>
      <div
        className={`mx-auto overflow-hidden rounded-2xl border ${cardClass} ${layout === "compact" ? "max-w-2xl" : "max-w-4xl"}`}
        style={{ borderColor: cardStyle === "outline" ? accent : undefined, textAlign: alignment as "left" | "center" }}
      >
        {update.image_url && layout === "showcase" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={update.image_url} alt="" className={`h-56 w-full sm:h-80 ${imageFit === "contain" ? "bg-black/35 object-contain" : "object-cover"}`} />
        )}
        <div className={layout === "compact" ? "p-5" : "p-6 sm:p-8"}>
          <div className={`flex flex-wrap gap-2 ${alignment === "center" ? "justify-center" : ""}`}>
            <span className="rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}18`, color: accent }}>
              {labels[update.update_type] ?? update.update_type}
            </span>
            {update.version_label && <span className="badge">{update.version_label}</span>}
          </div>
          {showDetailLink ? (
            <Link href={`/devlogs/${update.id}`}>
              <h3 className={`${layout === "compact" ? "mt-3 text-2xl" : "mt-4 text-3xl sm:text-4xl"} font-black transition hover:brightness-125`} style={{ color: accent, fontFamily: headingFont }}>
                {update.title}
              </h3>
            </Link>
          ) : (
            <h3 className={`${layout === "compact" ? "mt-3 text-2xl" : "mt-4 text-3xl sm:text-4xl"} font-black`} style={{ color: accent, fontFamily: headingFont }}>
              {update.title}
            </h3>
          )}
          {update.image_url && layout !== "showcase" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={update.image_url} alt="" className={`mt-5 max-h-[28rem] w-full rounded-xl ${imageFit === "contain" ? "bg-black/35 object-contain" : "object-cover"}`} />
          )}
          <p className="mt-5 whitespace-pre-wrap leading-8 text-white/80" style={{ fontFamily: bodyFont }}>{update.body}</p>
          <div className={`mt-6 flex flex-wrap items-center gap-3 ${alignment === "center" ? "justify-center" : "justify-between"}`}>
            <p className="text-xs text-white/55">
              Published {new Date(update.published_at ?? update.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {update.release_url && (
              <Link href={update.release_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition hover:bg-white/10" style={{ borderColor: `${accent}66`, color: accent }}>
                Open release <ExternalLink size={15} />
              </Link>
            )}
            {showDetailLink && (
              <Link href={`/devlogs/${update.id}#community`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition hover:bg-white/10" style={{ borderColor: `${accent}66`, color: accent }}>
                React &amp; comment
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
