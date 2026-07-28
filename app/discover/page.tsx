import { DiscoverFeed, type DiscoverProject } from "@/components/discovery/discover-feed";
import { createClient } from "@/lib/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data, error }, profileResult, projectFollowResult, creatorFollowResult, testingHistoryResult] = await Promise.all([
    supabase.rpc("browse_projects", {
      p_search: null,
      p_type: null,
      p_platform: null,
      p_stage: null,
      p_active_only: false,
      p_sort: "updated",
      p_limit: 12,
      p_offset: 0
    }),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("project_follows").select("project_id,projects!inner(platform,type)").eq("profile_id", user.id) : Promise.resolve({ data: [] }),
    user ? supabase.from("creator_follows").select("creator_id").eq("follower_id", user.id) : Promise.resolve({ data: [] }),
    user ? supabase.from("campaign_members").select("testing_campaigns!inner(projects!inner(platform,type))").eq("tester_id", user.id).limit(30) : Promise.resolve({ data: [] })
  ]);

  const projects = ((data ?? []) as DiscoverProject[]).map((project) => ({
    ...project,
    active_campaign_count: Number(project.active_campaign_count ?? 0),
    approved_test_count: Number(project.approved_test_count ?? 0),
    average_rating: project.average_rating === null ? null : Number(project.average_rating)
  }));
  const followedProjectIds = new Set((projectFollowResult.data ?? []).map((row: any) => row.project_id));
  const followedCreatorIds = new Set((creatorFollowResult.data ?? []).map((row: any) => row.creator_id));
  const preferredPlatforms = new Set<string>();
  const preferredTypes = new Set<string>();
  for (const row of projectFollowResult.data ?? []) {
    const project = Array.isArray((row as any).projects) ? (row as any).projects[0] : (row as any).projects;
    if (project?.platform) preferredPlatforms.add(project.platform);
    if (project?.type) preferredTypes.add(project.type);
  }
  for (const row of testingHistoryResult.data ?? []) {
    const campaign = Array.isArray((row as any).testing_campaigns) ? (row as any).testing_campaigns[0] : (row as any).testing_campaigns;
    const project = campaign ? (Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects) : null;
    if (project?.platform) preferredPlatforms.add(project.platform);
    if (project?.type) preferredTypes.add(project.type);
  }
  const score = (project: DiscoverProject) =>
    (followedProjectIds.has(project.id) ? 50 : 0) +
    (followedCreatorIds.has(project.owner_id) ? 30 : 0) +
    (preferredPlatforms.has(project.platform) ? 10 : 0) +
    (preferredTypes.has(project.type) ? 5 : 0) +
    (Number(project.active_campaign_count) > 0 ? 3 : 0);
  const personalisedProjects = user ? [...projects].sort((a, b) => score(b) - score(a)) : projects;
  const personalizationSummary = user ? {
    role: profileResult.data?.role ?? "both",
    platforms: [...preferredPlatforms].slice(0, 4),
    hasSignals: followedProjectIds.size > 0 || followedCreatorIds.size > 0 || preferredPlatforms.size > 0
  } : null;

  return (
    <section className="container-page py-14">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Discover</p>
        <h1 className="mt-2 text-4xl font-black">Find something worth testing</h1>
        <p className="mt-3 text-soft">Search, filter and keep scrolling through published indie apps and games.</p>
      </div>
      {error && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Initial projects could not be loaded: {error.message}</div>}
      <DiscoverFeed initialProjects={personalisedProjects} currentUserId={user?.id ?? null} personalization={personalizationSummary} />
    </section>
  );
}
