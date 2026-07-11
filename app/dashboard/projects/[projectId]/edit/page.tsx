import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import { createClient } from "@/lib/supabase/server";
import { updateProject } from "../../actions";

export default async function EditProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, name, type, stage, platform, genre, short_description, description, testing_url, known_issues, icon_url, cover_url, is_published, project_images(id, image_url, sort_order)")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.owner_id !== user.id) notFound();
  const screenshots = [...(project.project_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const action = updateProject.bind(null, project.id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/projects" className="text-sm font-bold text-cyan hover:text-white">
          ← Back to my projects
        </Link>
        <h2 className="mt-3 text-3xl font-black">Edit {project.name}</h2>
        <p className="mt-2 text-soft">Update details, replace images or remove old screenshots.</p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <ProjectForm
        action={action}
        submitLabel="Save changes"
        cancelHref="/dashboard/projects"
        defaults={{
          name: project.name,
          type: project.type,
          stage: project.stage,
          platform: project.platform,
          genre: project.genre,
          short_description: project.short_description,
          description: project.description,
          testing_url: project.testing_url,
          known_issues: project.known_issues,
          icon_url: project.icon_url,
          cover_url: project.cover_url,
          is_published: project.is_published,
          screenshots
        }}
      />
    </div>
  );
}
