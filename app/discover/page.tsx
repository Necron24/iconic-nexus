import { ProjectCard } from "@/components/project-card";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, slug, name, type, platform, stage, short_description, icon_url, cover_url")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <section className="container-page py-14">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Discover</p>
        <h1 className="mt-2 text-4xl font-black">Find something worth testing</h1>
        <p className="mt-3 text-soft">Browse published indie apps and games from the Iconic Nexus community.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">
          Projects could not be loaded: {error.message}
        </div>
      )}

      {!error && !projects?.length ? (
        <div className="card p-10 text-center">
          <h2 className="text-2xl font-black">No published projects yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-soft">The first published app or game will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      )}
    </section>
  );
}
