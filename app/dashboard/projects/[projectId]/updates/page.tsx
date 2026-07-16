import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteProjectUpdate } from "./actions";

const labels: Record<string, string> = {
  development: "Development update",
  release: "New release",
  bug_fixes: "Bug fixes",
  testing_needed: "Testing needed",
  major_update: "Major update",
  announcement: "Announcement"
};

export default async function ProjectUpdatesPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { projectId } = await params;
  const { success, error: queryError } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("projects").select("id,owner_id,name,slug").eq("id", projectId).maybeSingle();
  if (!project || project.owner_id !== user.id) redirect("/dashboard/projects");

  const { data: updates, error } = await supabase
    .from("project_updates")
    .select("id,title,body,version_label,update_type,is_published,created_at,updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/projects" className="text-sm font-bold text-cyan hover:text-white">← Back to my projects</Link>
          <h2 className="mt-3 text-3xl font-black">{project.name} updates</h2>
          <p className="mt-2 text-soft">Publish devlogs, releases and announcements for followers and testers.</p>
        </div>
        <Link href={`/dashboard/projects/${projectId}/updates/new`} className="btn-primary gap-2"><Plus size={18}/>Create update</Link>
      </div>

      {success && <div className="mb-5 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">{success}</div>}
      {(queryError || error) && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{queryError || error?.message}</div>}

      {!updates?.length ? (
        <div className="card p-10 text-center"><FileText className="mx-auto text-cyan" size={36}/><h3 className="mt-4 text-2xl font-black">No updates yet</h3><p className="mt-2 text-soft">Your first devlog will appear on the public project page.</p></div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <article key={update.id} className="card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap gap-2"><span className="badge">{labels[update.update_type] ?? update.update_type}</span>{update.version_label && <span className="badge">{update.version_label}</span>}<span className="badge">{update.is_published ? "Published" : "Draft"}</span></div>
                  <h3 className="text-xl font-black">{update.title}</h3>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-soft">{update.body}</p>
                  <p className="mt-3 text-xs text-soft">Created {new Date(update.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/dashboard/projects/${projectId}/updates/${update.id}/edit`} className="btn-secondary !px-4 !py-2 gap-2"><Pencil size={15}/>Edit</Link>
                  <form action={deleteProjectUpdate.bind(null, projectId, update.id)}><button type="submit" className="btn-secondary !px-4 !py-2 gap-2 text-red-200"><Trash2 size={15}/>Delete</button></form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
