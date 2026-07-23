import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  ExternalLink,
  Eye,
  FileText,
  Gauge,
  PauseCircle,
  Settings2,
  ShieldCheck,
  Users
} from "lucide-react";
import { joinCampaign } from "@/app/dashboard/campaigns/actions";
import { createClient } from "@/lib/supabase/server";
import { CreatorTag } from "@/components/campaigns/creator-tag";

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

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
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from("testing_campaigns")
    .select(
      "id, project_id, title, instructions, minimum_minutes, tester_goal, reward_credits, duration_days, starts_at, ends_at, status, reserved_credits, spent_credits, projects!inner(id, owner_id, name, slug, platform, stage, short_description, icon_url, cover_url, testing_url, is_published, moderation_status, profiles!projects_owner_id_fkey(username, display_name, avatar_url, role))"
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) notFound();

  const project = Array.isArray(campaign.projects)
    ? campaign.projects[0]
    : campaign.projects;

  if (!project || (!project.is_published && project.owner_id !== user?.id)) {
    notFound();
  }

  const creator = Array.isArray(project.profiles)
    ? project.profiles[0]
    : project.profiles;

  const owner = user?.id === project.owner_id;

  const [{ data: joinedCount }, { data: membership }, { data: ownerMembers }] =
    await Promise.all([
      supabase.rpc("get_campaign_member_count", {
        p_campaign_id: campaign.id
      }),
      user
        ? supabase
            .from("campaign_members")
            .select("id, status, joined_at")
            .eq("campaign_id", campaign.id)
            .eq("tester_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      owner
        ? supabase
            .from("campaign_members")
            .select("id,status,joined_at,submitted_at,approved_at")
            .eq("campaign_id", campaign.id)
        : Promise.resolve({ data: [] })
    ]);

  const joined = Number(joinedCount ?? 0);
  const members = ownerMembers ?? [];
  const full = joined >= campaign.tester_goal;
  const expired = campaign.ends_at
    ? new Date(campaign.ends_at).getTime() <= Date.now()
    : false;
  const active = campaign.status === "active" && !expired;
  const daysLeft = campaign.ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(campaign.ends_at).getTime() - Date.now()) / 86400000
        )
      )
    : campaign.duration_days;
  const joinAction = joinCampaign.bind(null, campaign.id);

  const counts = {
    joined: members.filter((member) => member.status === "joined").length,
    testing: members.filter((member) => member.status === "in_progress").length,
    submitted: members.filter((member) => member.status === "submitted").length,
    approved: members.filter((member) => member.status === "approved").length,
    changesRequested: members.filter((member) =>
      ["changes_requested", "rejected"].includes(member.status)
    ).length,
    disputed: members.filter((member) =>
      ["appealed", "disputed", "under_review"].includes(member.status)
    ).length
  };

  const reservedCredits = Number(campaign.reserved_credits ?? 0);
  const spentCredits = Number(campaign.spent_credits ?? 0);
  const originalBudget = reservedCredits + spentCredits;

  return (
    <section className="container-page py-14">
      {success && (
        <div className="mb-5 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        {project.cover_url && (
          <div className="h-48 overflow-hidden md:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="grid gap-8 p-6 md:p-9 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-start gap-4">
              {project.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.icon_url}
                  alt=""
                  className="h-20 w-20 rounded-2xl object-cover"
                />
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
                  {owner && (
                    <span className="badge border-lime/30 bg-lime/10 text-lime">
                      My campaign
                    </span>
                  )}
                </div>

                <h1 className="text-4xl font-black md:text-5xl">
                  {campaign.title}
                </h1>

                <Link
                  href={`/projects/${project.slug}`}
                  className="mt-2 inline-block font-bold text-cyan hover:underline"
                >
                  {project.name}
                </Link>

                <CreatorTag
                  username={creator?.username ?? null}
                  displayName={creator?.display_name ?? null}
                  avatarUrl={creator?.avatar_url ?? null}
                  role={creator?.role ?? null}
                  className="mt-4 w-full max-w-md"
                />
              </div>
            </div>

            {owner && (
              <div className="card mt-8 border-cyan/20 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan">
                      Creator controls
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Manage this campaign
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-soft">
                      You own this campaign. Manage testers, review submissions,
                      control campaign status and monitor reserved rewards here.
                    </p>
                  </div>
                  <span className="badge">
                    Project {project.is_published ? "published" : "unpublished"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Link
                    href={`/dashboard/projects/${project.id}/campaigns/${campaign.id}/manage`}
                    className="btn-primary justify-center gap-2"
                  >
                    <Settings2 size={17} /> Manage campaign
                  </Link>
                  <Link
                    href={`/dashboard/projects/${project.id}/campaigns/${campaign.id}/feedback`}
                    className="btn-secondary justify-center gap-2"
                  >
                    <FileText size={17} /> View submissions
                  </Link>
                  <Link
                    href={`/dashboard/projects/${project.id}/edit`}
                    className="btn-secondary justify-center gap-2"
                  >
                    <Eye size={17} /> Edit project
                  </Link>
                  <Link
                    href="/dashboard/projects"
                    className="btn-secondary justify-center gap-2"
                  >
                    <Activity size={17} /> My projects
                  </Link>
                </div>
              </div>
            )}

            <div className="card mt-8 p-6">
              <h2 className="text-2xl font-black">Testing instructions</h2>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-soft">
                {campaign.instructions}
              </p>
            </div>

            <div className="card mt-5 p-6">
              <h2 className="text-2xl font-black">About the project</h2>
              <p className="mt-3 leading-7 text-soft">
                {project.short_description}
              </p>
              {project.testing_url && (
                <a
                  href={project.testing_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary mt-5 gap-2"
                >
                  Open testing link <ExternalLink size={17} />
                </a>
              )}
            </div>

            {owner && (
              <div className="card mt-5 p-6">
                <div className="flex items-center gap-3">
                  <Gauge className="text-cyan" />
                  <div>
                    <h2 className="text-2xl font-black">Tester progress</h2>
                    <p className="text-sm text-soft">
                      Live status of people who joined this campaign.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Joined", counts.joined],
                    ["Currently testing", counts.testing],
                    ["Awaiting review", counts.submitted],
                    ["Approved", counts.approved],
                    ["Changes requested", counts.changesRequested],
                    ["Under dispute", counts.disputed]
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-white/5 p-4">
                      <p className="text-xs text-soft">{label}</p>
                      <p className="mt-1 text-2xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="card h-fit p-6">
              <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan">
                Campaign details
              </p>

              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-soft">
                    <Users size={17} /> Testers
                  </span>
                  <strong>
                    {joined}/{campaign.tester_goal}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-soft">
                    <CalendarDays size={17} /> Time left
                  </span>
                  <strong>{daysLeft} days</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-soft">
                    <Clock3 size={17} /> Minimum test
                  </span>
                  <strong>{campaign.minimum_minutes} min</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-soft">
                    <Coins size={17} /> Reward
                  </span>
                  <strong>{campaign.reward_credits}</strong>
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-lime"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((joined / campaign.tester_goal) * 100)
                    )}%`
                  }}
                />
              </div>

              {membership ? (
                <div className="mt-6 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">
                  <p className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={18} /> You joined this campaign
                  </p>
                  <p className="mt-2 text-lime/80">
                    Status: {membership.status.replaceAll("_", " ")}
                  </p>
                  <Link
                    href={`/dashboard/testing/${membership.id}`}
                    className="btn-primary mt-4 w-full"
                  >
                    Open testing workspace
                  </Link>
                </div>
              ) : owner ? (
                <div className="mt-6 rounded-xl border border-cyan/20 bg-cyan/5 p-4 text-sm text-soft">
                  <p className="font-bold text-cyan">You own this campaign</p>
                  <p className="mt-2 leading-6">
                    You cannot join your own test campaign. Use the creator
                    controls to manage testers, submissions and rewards.
                  </p>
                </div>
              ) : !active ? (
                <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-soft">
                  This campaign is not currently active.
                </div>
              ) : full ? (
                <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-soft">
                  This campaign has reached its tester goal.
                </div>
              ) : (
                <form action={joinAction} className="mt-6">
                  <button type="submit" className="btn-primary w-full">
                    Join campaign
                  </button>
                  {!user && (
                    <p className="mt-3 text-center text-xs text-soft">
                      You will be asked to log in first.
                    </p>
                  )}
                </form>
              )}
            </div>

            {owner && (
              <div className="card p-6">
                <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan">
                  Owner overview
                </p>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-soft">Campaign status</span>
                    <strong className="capitalize">{campaign.status}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-soft">Visibility</span>
                    <strong>
                      {project.is_published &&
                      project.moderation_status !== "hidden"
                        ? "Public"
                        : "Private"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-soft">Starts</span>
                    <strong>{formatDate(campaign.starts_at)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-soft">Ends</span>
                    <strong>{formatDate(campaign.ends_at)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-soft">Original budget</span>
                    <strong>{originalBudget}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-soft">Still reserved</span>
                    <strong>{reservedCredits}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-soft">Already awarded</span>
                    <strong>{spentCredits}</strong>
                  </div>
                </div>

                <Link
                  href={`/dashboard/projects/${project.id}/campaigns/${campaign.id}/manage`}
                  className="btn-primary mt-6 w-full justify-center gap-2"
                >
                  {campaign.status === "active" ? (
                    <PauseCircle size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}
                  Open campaign management
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
