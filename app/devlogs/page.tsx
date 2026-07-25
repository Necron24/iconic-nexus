import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Newspaper, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DevlogPreviewCard, type DevlogPreview } from "@/components/updates/devlog-preview-card";

export const metadata: Metadata = {
  title: "Devlogs | Iconic Nexus",
  description: "Follow new releases, development progress, bug fixes and testing announcements from Iconic Nexus creators."
};

const PAGE_SIZE = 10;
const allowedTypes = new Set(["development", "release", "bug_fixes", "testing_needed", "major_update", "announcement"]);

type DevlogRow = {
  id: string;
  title: string;
  body: string;
  version_label: string | null;
  update_type: string;
  image_url: string | null;
  release_url: string | null;
  created_at: string;
  published_at: string | null;
  accent_color: string | null;
  background_color: string | null;
  background_style: string | null;
  background_image_url: string | null;
  heading_font: string | null;
  body_font: string | null;
  card_style: string | null;
  layout_style: string | null;
  text_align: string | null;
  image_fit: string | null;
  projects: {
    slug: string;
    name: string;
    icon_url: string | null;
    platform: string;
    stage: string;
  } | Array<{
    slug: string;
    name: string;
    icon_url: string | null;
    platform: string;
    stage: string;
  }>;
};

function pageHref(page: number, search: string, type: string, sort: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type) params.set("type", type);
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/devlogs?${query}` : "/devlogs";
}

export default async function DevlogsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; type?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = String(params.search ?? "").trim().slice(0, 80);
  const type = allowedTypes.has(String(params.type ?? "")) ? String(params.type) : "";
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, Math.min(1000, Number.parseInt(String(params.page ?? "1"), 10) || 1));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("project_updates")
    .select(
      "id,title,body,version_label,update_type,image_url,release_url,created_at,published_at,accent_color,background_color,background_style,background_image_url,heading_font,body_font,card_style,layout_style,text_align,image_fit,projects!inner(slug,name,icon_url,platform,stage)",
      { count: "exact" }
    )
    .eq("is_published", true);

  if (type) query = query.eq("update_type", type);
  if (search) {
    const safeSearch = search.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
    if (safeSearch) query = query.or(`title.ilike.%${safeSearch}%,body.ilike.%${safeSearch}%`);
  }

  const { data, count, error } = await query
    .order("published_at", { ascending: sort === "oldest", nullsFirst: false })
    .order("created_at", { ascending: sort === "oldest" })
    .range(offset, offset + PAGE_SIZE - 1);

  const updates = (data ?? []) as DevlogRow[];
  const total = count ?? 0;
  const hasNext = offset + updates.length < total;
  const reactionCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();

  if (updates.length > 0) {
    const updateIds = updates.map((update) => update.id);
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      supabase.from("devlog_reactions").select("update_id").in("update_id", updateIds),
      supabase.from("devlog_comments").select("update_id").in("update_id", updateIds).eq("is_deleted", false)
    ]);
    for (const row of reactions ?? []) reactionCounts.set(row.update_id, (reactionCounts.get(row.update_id) ?? 0) + 1);
    for (const row of comments ?? []) commentCounts.set(row.update_id, (commentCounts.get(row.update_id) ?? 0) + 1);
  }

  return (
    <section className="container-page py-14">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.25em] text-cyan"><Newspaper size={17} /> Devlogs</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Follow what creators are building</h1>
          <p className="mt-3 max-w-2xl text-soft">New releases, honest progress reports, bug fixes and calls for testers—all in one public feed.</p>
        </div>
        <Link href="/dashboard/projects" className="btn-primary">Publish a devlog</Link>
      </div>

      <form method="get" className="card mb-8 grid gap-4 p-5 md:grid-cols-[minmax(240px,1fr)_220px_180px_auto]">
        <label className="relative">
          <span className="sr-only">Search devlogs</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft" size={18} />
          <input name="search" defaultValue={search} className="field pl-10" placeholder="Search devlog titles and stories" />
        </label>
        <select name="type" defaultValue={type} className="field" aria-label="Filter by update type">
          <option value="">All update types</option>
          <option value="development">Development updates</option>
          <option value="release">New releases</option>
          <option value="bug_fixes">Bug fixes</option>
          <option value="testing_needed">Testing needed</option>
          <option value="major_update">Major updates</option>
          <option value="announcement">Announcements</option>
        </select>
        <select name="sort" defaultValue={sort} className="field" aria-label="Sort devlogs">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button className="btn-primary">Apply</button>
      </form>

      {error && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Devlogs could not be loaded: {error.message}</div>}

      {!error && updates.length === 0 ? (
        <div className="card p-10 text-center">
          <Newspaper className="mx-auto text-cyan" size={38} />
          <h2 className="mt-4 text-2xl font-black">No matching devlogs yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-soft">Try another search or filter, or be the first creator to publish an update.</p>
          {(search || type) && <Link href="/devlogs" className="btn-secondary mt-6">Clear filters</Link>}
        </div>
      ) : (
        <div className="space-y-8">
          {updates.map((update) => {
            const project = Array.isArray(update.projects) ? update.projects[0] : update.projects;
            const preview: DevlogPreview = {
              ...update,
              project,
              reaction_count: reactionCounts.get(update.id) ?? 0,
              comment_count: commentCounts.get(update.id) ?? 0
            };
            return <DevlogPreviewCard key={update.id} update={preview} />;
          })}
        </div>
      )}

      {(page > 1 || hasNext) && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Devlog pages">
          {page > 1 && <Link href={pageHref(page - 1, search, type, sort)} className="btn-secondary gap-2"><ArrowLeft size={16} /> Newer</Link>}
          <span className="badge">Page {page}</span>
          {hasNext && <Link href={pageHref(page + 1, search, type, sort)} className="btn-secondary gap-2">Older <ArrowRight size={16} /></Link>}
        </nav>
      )}
    </section>
  );
}
