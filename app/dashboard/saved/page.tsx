import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, BookmarkX, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toggleDevlogBookmark } from "@/app/devlogs/[updateId]/actions";

type SavedRow = {
  created_at: string;
  project_updates: {
    id: string;
    title: string;
    body: string;
    update_type: string;
    published_at: string | null;
    created_at: string;
    accent_color: string | null;
    projects: { slug: string; name: string; icon_url: string | null } | Array<{ slug: string; name: string; icon_url: string | null }>;
  } | Array<{
    id: string;
    title: string;
    body: string;
    update_type: string;
    published_at: string | null;
    created_at: string;
    accent_color: string | null;
    projects: { slug: string; name: string; icon_url: string | null } | Array<{ slug: string; name: string; icon_url: string | null }>;
  }>;
};

export default async function SavedDevlogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("devlog_bookmarks")
    .select("created_at,project_updates!inner(id,title,body,update_type,published_at,created_at,accent_color,projects!inner(slug,name,icon_url))")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as SavedRow[];

  return (
    <div>
      <div className="mb-6">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.2em] text-cyan"><Bookmark size={16} /> Saved</p>
        <h2 className="mt-2 text-3xl font-black">Saved devlogs</h2>
        <p className="mt-2 text-soft">Keep useful releases, progress reports and testing calls close at hand.</p>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error.message}</div>}
      {!error && rows.length === 0 ? (
        <div className="card p-10 text-center">
          <Bookmark className="mx-auto text-cyan" size={36} />
          <h3 className="mt-4 text-2xl font-black">Nothing saved yet</h3>
          <p className="mt-2 text-soft">Save a devlog and it will appear here.</p>
          <Link href="/devlogs" className="btn-primary mt-6">Browse devlogs</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const update = Array.isArray(row.project_updates) ? row.project_updates[0] : row.project_updates;
            const project = Array.isArray(update.projects) ? update.projects[0] : update.projects;
            return (
              <article key={update.id} className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/devlogs/${update.id}`} className="group min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {project.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={project.icon_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                      ) : (
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime font-black text-ink">{project.name.charAt(0)}</span>
                      )}
                      <div className="min-w-0"><p className="text-xs text-soft">{project.name}</p><h3 className="truncate text-xl font-black transition group-hover:text-cyan" style={{ color: update.accent_color ?? undefined }}>{update.title}</h3></div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-soft">{update.body}</p>
                  </Link>
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/devlogs/${update.id}`} className="btn-primary !px-4 !py-2 gap-2"><MessageCircle size={15} /> Open</Link>
                    <form action={toggleDevlogBookmark.bind(null, update.id)}><button className="btn-secondary !px-4 !py-2 gap-2 text-red-200"><BookmarkX size={15} /> Remove</button></form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
