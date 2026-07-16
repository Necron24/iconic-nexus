import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdateForm } from "@/components/updates/update-form";
import { updateProjectUpdate } from "../../actions";

export default async function EditProjectUpdatePage({ params, searchParams }: { params: Promise<{ projectId: string; updateId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { projectId, updateId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: project } = await supabase.from("projects").select("id,owner_id,name").eq("id", projectId).maybeSingle();
  if (!project || project.owner_id !== user.id) redirect("/dashboard/projects");
  const { data: update } = await supabase.from("project_updates").select("id,title,body,version_label,update_type,image_url,release_url,is_published").eq("id", updateId).eq("project_id", projectId).maybeSingle();
  if (!update) redirect(`/dashboard/projects/${projectId}/updates`);

  return <div className="mx-auto max-w-3xl"><Link href={`/dashboard/projects/${projectId}/updates`} className="text-sm font-bold text-cyan hover:text-white">← Back to updates</Link><h2 className="mt-3 text-3xl font-black">Edit update</h2><p className="mt-2 mb-6 text-soft">Update the devlog without creating a duplicate post.</p>{error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}<UpdateForm action={updateProjectUpdate.bind(null, projectId, updateId)} values={update} submitLabel="Save update" cancelHref={`/dashboard/projects/${projectId}/updates`} /></div>;
}
