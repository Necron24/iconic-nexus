import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, Coins, ExternalLink, Users } from "lucide-react";
import { joinCampaign } from "@/app/dashboard/campaigns/actions";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignPage({
  params,
  searchParams
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { campaignId } = await params;
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from("testing_campaigns")
    .select("id, project_id, title, instructions, minimum_minutes, tester_goal, reward_credits, duration_days, starts_at, ends_at, status, projects!inner(id, owner_id, name, slug, platform, stage, short_description, icon_url, cover_url, testing_url, is_published)")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) notFound();
  const project = Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects;
  if (!project || (!project.is_published && project.owner_id !== user?.id)) notFound();

  const { data: joinedCount } = await supabase.rpc("get_campaign_member_count", {
    p_campaign_id: campaign.id
  });

  const { data: membership } = user
    ? await supabase
        .from("campaign_members")
        .select("id, status, joined_at")
        .eq("campaign_id", campaign.id)
        .eq("tester_id", user.id)
        .maybeSingle()
    : { data: null };

  const joined = joinedCount ?? 0;
  const full = joined >= campaign.tester_goal;
  const expired = campaign.ends_at ? new Date(campaign.ends_at).getTime() <= Date.now() : false;
  const active = campaign.status === "active" && !expired;
  const owner = user?.id === project.owner_id;
  const daysLeft = campaign.ends_at
    ? Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000))
    : campaign.duration_days;
  const joinAction = joinCampaign.bind(null, campaign.id);

  return (
    <section className="container-page py-14">
      {success && <div className="mb-5 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">{success}</div>}
      {error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        {project.cover_url && (
          <div className="h-48 overflow-hidden md:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.cover_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="grid gap-8 p-6 md:p-9 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex items-start gap-4">
              {project.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.icon_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-lime text-3xl font-black text-ink">
                  {project.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="badge">{project.platform}</span>
                  <span className="badge">{project.stage}</span>
                  <span className="badge">{campaign.status}</span>
                </div>
                <h1 className="text-4xl font-black md:text-5xl">{campaign.title}</h1>
                <Link href={`/projects/${project.slug}`} className="mt-2 inline-block font-bold text-cyan hover:underline">{project.name}</Link>
              </div>
            </div>

            <div className="card mt-8 p-6">
              <h2 className="text-2xl font-black">Testing instructions</h2>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-soft">{campaign.instructions}</p>
            </div>

            <div className="card mt-5 p-6">
              <h2 className="text-2xl font-black">About the project</h2>
              <p className="mt-3 leading-7 text-soft">{project.short_description}</p>
              {project.testing_url && (
                <a href={project.testing_url} target="_blank" rel="noreferrer" className="btn-secondary mt-5 gap-2">
                  Open testing link <ExternalLink size={17} />
                </a>
              )}
            </div>
          </div>

          <aside className="card h-fit p-6">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan">Campaign details</p>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-soft"><Users size={17} /> Testers</span>
                <strong>{joined}/{campaign.tester_goal}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-soft"><CalendarDays size={17} /> Time left</span>
                <strong>{daysLeft} days</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-soft"><Clock3 size={17} /> Minimum test</span>
                <strong>{campaign.minimum_minutes} min</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-soft"><Coins size={17} /> Reward</span>
                <strong>{campaign.reward_credits}</strong>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, Math.round((joined / campaign.tester_goal) * 100))}%` }} />
            </div>

            {membership ? (
              <div className="mt-6 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">
                <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> You joined this campaign</p>
                <p className="mt-2 text-lime/80">Status: {membership.status.replaceAll("_", " ")}</p>
                <Link href={`/dashboard/testing/${membership.id}`} className="btn-primary mt-4 w-full">Open testing workspace</Link>
              </div>
            ) : owner ? (
              <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-soft">You own this project and cannot join its test campaign.</div>
            ) : !active ? (
              <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-soft">This campaign is not currently active.</div>
            ) : full ? (
              <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-soft">This campaign has reached its tester goal.</div>
            ) : (
              <form action={joinAction} className="mt-6">
                <button type="submit" className="btn-primary w-full">Join campaign</button>
                {!user && <p className="mt-3 text-center text-xs text-soft">You will be asked to log in first.</p>}
              </form>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
