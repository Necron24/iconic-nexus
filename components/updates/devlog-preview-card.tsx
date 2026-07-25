import Link from "next/link";
import { Bookmark, MessageCircle, Sparkles } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import {
  DEFAULT_DEVLOG_STYLE,
  devlogBackground,
  headingFontStacks,
  type DevlogStyle
} from "@/lib/devlog-style";

export type DevlogPreview = DevlogStyle & {
  id: string;
  title: string;
  body: string;
  version_label: string | null;
  update_type: string;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
  reaction_count: number;
  comment_count: number;
  project: {
    slug: string;
    name: string;
    icon_url: string | null;
    platform: string;
    stage: string;
  };
};

const labels: Record<string, string> = {
  development: "Development update",
  release: "New release",
  bug_fixes: "Bug fixes",
  testing_needed: "Testing needed",
  major_update: "Major update",
  announcement: "Announcement"
};

export function DevlogPreviewCard({ update }: { update: DevlogPreview }) {
  const accent = update.accent_color ?? DEFAULT_DEVLOG_STYLE.accent_color;
  const headingFont = headingFontStacks[update.heading_font ?? "display"] ?? headingFontStacks.display;

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 transition hover:-translate-y-0.5 hover:border-white/20">
      <div className="p-4 sm:p-6" style={{ background: devlogBackground(update) }}>
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row">
            {update.image_url && (
              <Link href={`/devlogs/${update.id}`} className="block shrink-0 overflow-hidden rounded-xl md:w-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={update.image_url} alt="" className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-full" />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: `${accent}66`, backgroundColor: `${accent}18`, color: accent }}>
                  {labels[update.update_type] ?? update.update_type}
                </span>
                {update.version_label && <span className="badge">{update.version_label}</span>}
              </div>
              <Link href={`/devlogs/${update.id}`}>
                <h2 className="mt-4 text-2xl font-black transition group-hover:brightness-125 sm:text-3xl" style={{ color: accent, fontFamily: headingFont }}>{update.title}</h2>
              </Link>
              <p className="mt-3 line-clamp-3 leading-7 text-white/70">{update.body}</p>
              <p className="mt-4 text-xs text-white/50">
                Published {new Date(update.published_at ?? update.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`/projects/${update.project.slug}`} className="flex min-w-0 items-center gap-3">
          {update.project.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={update.project.icon_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime font-black text-ink">{update.project.name.charAt(0)}</span>
          )}
          <span className="min-w-0"><strong className="block truncate hover:text-cyan">{update.project.name}</strong><span className="text-xs text-soft">{update.project.platform} · {update.project.stage}</span></span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge gap-1.5"><Sparkles size={13} /> {update.reaction_count}</span>
          <span className="badge gap-1.5"><MessageCircle size={13} /> {update.comment_count}</span>
          <ShareButton title={update.title} text={`Read ${update.title} on Iconic Nexus.`} path={`/devlogs/${update.id}`} className="btn-secondary !px-3 !py-2 gap-2" />
          <Link href={`/devlogs/${update.id}`} className="btn-primary !px-4 !py-2 gap-2">Read devlog <Bookmark size={15} /></Link>
        </div>
      </div>
    </article>
  );
}
