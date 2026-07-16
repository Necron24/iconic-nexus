import { DiscoverFeed, type DiscoverProject } from "@/components/discovery/discover-feed";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("browse_projects", {
    p_search: null,
    p_type: null,
    p_platform: null,
    p_stage: null,
    p_active_only: false,
    p_sort: "updated",
    p_limit: 12,
    p_offset: 0
  });

  const projects = ((data ?? []) as DiscoverProject[]).map((project) => ({
    ...project,
    active_campaign_count: Number(project.active_campaign_count ?? 0),
    approved_test_count: Number(project.approved_test_count ?? 0),
    average_rating: project.average_rating === null ? null : Number(project.average_rating)
  }));

  return (
    <section className="container-page py-14">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Discover</p>
        <h1 className="mt-2 text-4xl font-black">Find something worth testing</h1>
        <p className="mt-3 text-soft">Search, filter and keep scrolling through published indie apps and games.</p>
      </div>
      {error && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Initial projects could not be loaded: {error.message}</div>}
      <DiscoverFeed initialProjects={projects} />
    </section>
  );
}
