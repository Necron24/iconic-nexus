import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, FolderKanban, UserRound, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/follow-button";
import { toggleCampaignWatch, toggleCreatorFollow, toggleProjectFollow } from "@/app/following/actions";
import { CampaignStatusBadge, PlatformBadges, StageBadge } from "@/components/project-meta";

export default async function FollowingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: creators }, { data: projects }, { data: campaigns }] = await Promise.all([
    supabase.from("creator_follows")
      .select("created_at,profiles!creator_follows_creator_id_fkey(id,username,display_name,avatar_url,headline,role)")
      .eq("follower_id", user.id).order("created_at", { ascending: false }),
    supabase.from("project_follows")
      .select("created_at,projects!inner(id,slug,name,short_description,icon_url,stage,platform)")
      .eq("profile_id", user.id).order("created_at", { ascending: false }),
    supabase.from("campaign_watches")
      .select("created_at,testing_campaigns!inner(id,title,status,ends_at,reward_credits,projects!inner(name,slug))")
      .eq("profile_id", user.id).order("created_at", { ascending: false })
  ]);

  const creatorRows = creators ?? [];
  const projectRows = projects ?? [];
  const campaignRows = campaigns ?? [];
  const total = creatorRows.length + projectRows.length + campaignRows.length;

  return (
    <div className="space-y-7">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.2em] text-cyan"><Users size={16} /> Following</p>
        <h2 className="mt-2 text-3xl font-black">Your followed world</h2>
        <p className="mt-2 text-soft">Creators, projects and campaigns you want to hear from.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["Creators", creatorRows.length], ["Projects", projectRows.length], ["Watched campaigns", campaignRows.length]].map(([label, value]) => (
          <div key={String(label)} className="card p-4"><p className="text-xs text-soft">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>
        ))}
      </div>

      {total === 0 && (
        <div className="card p-10 text-center">
          <Users className="mx-auto text-cyan" size={38} />
          <h3 className="mt-4 text-2xl font-black">You are not following anything yet</h3>
          <p className="mt-2 text-soft">Follow creators and projects, or watch a campaign to build your personal feed.</p>
          <Link href="/discover" className="btn-primary mt-6">Discover projects</Link>
        </div>
      )}

      {creatorRows.length > 0 && <section>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-black"><UserRound className="text-lime" size={20} />Creators</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {creatorRows.map((row: any) => {
            const creator = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            if (!creator) return null;
            return <article key={creator.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><Link href={`/profiles/${creator.username}`} className="flex min-w-0 items-center gap-3">{creator.avatar_url ? <img src={creator.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-lime font-black text-ink">{(creator.display_name || creator.username).charAt(0)}</span>}<span className="min-w-0"><span className="block truncate font-black">{creator.display_name || creator.username}</span><span className="block truncate text-sm text-soft">@{creator.username} · {creator.role}</span></span></Link><FollowButton action={toggleCreatorFollow.bind(null, creator.id, "/dashboard/following")} following kind="creator" /></article>;
          })}
        </div>
      </section>}

      {projectRows.length > 0 && <section>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-black"><FolderKanban className="text-cyan" size={20} />Projects</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {projectRows.map((row: any) => {
            const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
            if (!project) return null;
            return <article key={project.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><Link href={`/projects/${project.slug}`} className="flex min-w-0 items-center gap-3">{project.icon_url ? <img src={project.icon_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-cyan font-black text-ink">{project.name.charAt(0)}</span>}<span className="min-w-0"><span className="block truncate font-black">{project.name}</span><span className="mt-1 flex flex-wrap gap-1"><PlatformBadges platform={project.platform} compact /><StageBadge stage={project.stage} compact /></span></span></Link><FollowButton action={toggleProjectFollow.bind(null, project.id, "/dashboard/following")} following kind="project" /></article>;
          })}
        </div>
      </section>}

      {campaignRows.length > 0 && <section>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-black"><Bell className="text-amber-300" size={20} />Watched campaigns</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {campaignRows.map((row: any) => {
            const campaign = Array.isArray(row.testing_campaigns) ? row.testing_campaigns[0] : row.testing_campaigns;
            const project = campaign ? (Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects) : null;
            if (!campaign) return null;
            return <article key={campaign.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><Link href={`/campaigns/${campaign.id}`} className="min-w-0"><span className="block truncate font-black">{campaign.title}</span><span className="mt-1 block truncate text-sm text-soft">{project?.name ?? "Project"} · {campaign.reward_credits} credits</span><span className="mt-2 flex"><CampaignStatusBadge status={campaign.status} /></span></Link><FollowButton action={toggleCampaignWatch.bind(null, campaign.id, "/dashboard/following")} following kind="campaign" /></article>;
          })}
        </div>
      </section>}
    </div>
  );
}
