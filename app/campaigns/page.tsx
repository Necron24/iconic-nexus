import Link from "next/link";
import { CalendarDays, Clock3, Coins, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: campaigns } = await supabase
    .from("testing_campaigns")
    .select("id, title, minimum_minutes, tester_goal, reward_credits, duration_days, ends_at, projects!inner(name, slug, platform, stage, short_description, icon_url, is_published)")
    .eq("status", "active")
    .eq("projects.is_published", true)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("created_at", { ascending: false });

  const countResults = await Promise.all(
    (campaigns ?? []).map(async (campaign) => {
      const { data } = await supabase.rpc("get_campaign_member_count", { p_campaign_id: campaign.id });
      return [campaign.id, Number(data ?? 0)] as const;
    })
  );
  const memberCounts = new Map<string, number>(countResults);

  return (
    <section className="container-page py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Testing campaigns</p>
          <h1 className="mt-2 text-4xl font-black">Join an active test</h1>
          <p className="mt-3 text-soft">Help creators improve their projects and build your Nexus reputation.</p>
        </div>
        <Link href="/dashboard/projects" className="btn-primary">Create campaign</Link>
      </div>

      {(campaigns ?? []).length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="text-2xl font-black">No active campaigns yet</h2>
          <p className="mt-3 text-soft">Published testing campaigns will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(campaigns ?? []).map((campaign) => {
            const project = Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects;
            if (!project) return null;
            const joined = memberCounts.get(campaign.id) ?? 0;
            const percentage = Math.min(100, Math.round((joined / campaign.tester_goal) * 100));
            const daysLeft = campaign.ends_at
              ? Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000))
              : campaign.duration_days;

            return (
              <article key={campaign.id} className="card grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex gap-4">
                  {project.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.icon_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-lime text-2xl font-black text-ink">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="badge">{project.platform}</span>
                      <span className="badge">{project.stage}</span>
                    </div>
                    <h2 className="text-2xl font-black">{campaign.title}</h2>
                    <p className="mt-1 font-semibold text-white/80">{project.name}</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-soft">{project.short_description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-soft">
                      <span className="flex items-center gap-2"><Users size={16} /> {joined}/{campaign.tester_goal} testers</span>
                      <span className="flex items-center gap-2"><CalendarDays size={16} /> {daysLeft} days left</span>
                      <span className="flex items-center gap-2"><Clock3 size={16} /> {campaign.minimum_minutes}+ min</span>
                      <span className="flex items-center gap-2"><Coins size={16} /> {campaign.reward_credits} credits</span>
                    </div>
                    <div className="mt-4 h-2 max-w-xl overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </div>
                <Link href={`/campaigns/${campaign.id}`} className="btn-secondary">View campaign</Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
