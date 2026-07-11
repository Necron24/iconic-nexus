import { notFound, redirect } from "next/navigation";
import { Coins, PiggyBank, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CampaignForm } from "@/components/campaign-form";
import { changeCampaignStatus, updateCampaign } from "@/app/dashboard/campaigns/actions";

export default async function ManageCampaignPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string; campaignId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { projectId, campaignId } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("id,name,owner_id").eq("id", projectId).maybeSingle(),
    supabase.from("profiles").select("credits").eq("id", user.id).single()
  ]);
  if (!project || project.owner_id !== user.id) notFound();

  const { data: campaign } = await supabase
    .from("testing_campaigns")
    .select("id,title,instructions,tester_goal,duration_days,minimum_minutes,reward_credits,status,starts_at,ends_at,reserved_credits,spent_credits,campaign_members(id,status,profiles!campaign_members_tester_id_fkey(username,display_name))")
    .eq("id", campaignId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!campaign) notFound();

  const update = updateCampaign.bind(null, projectId, campaignId);
  const statusAction = changeCampaignStatus.bind(null, projectId, campaignId);
  const totalBudget = Number(campaign.reserved_credits ?? 0) + Number(campaign.spent_credits ?? 0);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Campaign management</p>
        <h2 className="mt-2 text-3xl font-black">{campaign.title}</h2>
        <p className="mt-2 text-soft">Current status: {campaign.status}</p>
      </div>

      {messages.success && <div className="mb-5 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">{messages.success}</div>}
      {messages.error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{messages.error}</div>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <WalletCards className="text-lime" size={22} />
          <p className="mt-3 text-xs text-soft">Available balance</p>
          <p className="mt-1 text-2xl font-black">{Number(profile?.credits ?? 0)}</p>
        </div>
        <div className="card p-5">
          <PiggyBank className="text-cyan" size={22} />
          <p className="mt-3 text-xs text-soft">Still reserved</p>
          <p className="mt-1 text-2xl font-black">{Number(campaign.reserved_credits ?? 0)}</p>
        </div>
        <div className="card p-5">
          <Coins className="text-lime" size={22} />
          <p className="mt-3 text-xs text-soft">Already paid</p>
          <p className="mt-1 text-2xl font-black">{Number(campaign.spent_credits ?? 0)}</p>
        </div>
      </div>

      <div className="mb-6 card p-6">
        <h3 className="text-xl font-black">Campaign controls</h3>
        <p className="mt-2 text-sm text-soft">Completing or cancelling the campaign returns all unused reserved credits to your balance.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {campaign.status !== "active" && campaign.status !== "completed" && campaign.status !== "cancelled" && (
            <form action={statusAction}><button name="status" value="active" className="btn-primary">Start / resume</button></form>
          )}
          {campaign.status === "active" && (
            <form action={statusAction}><button name="status" value="paused" className="btn-secondary">Pause campaign</button></form>
          )}
          {!['completed', 'cancelled'].includes(campaign.status) && (
            <form action={statusAction}><button name="status" value="completed" className="btn-secondary">Complete and refund unused</button></form>
          )}
          {campaign.status !== "cancelled" && campaign.status !== "completed" && (
            <form action={statusAction}><button name="status" value="cancelled" className="rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-3 font-semibold text-red-200">Cancel and refund unused</button></form>
          )}
        </div>
      </div>

      {!['completed', 'cancelled'].includes(campaign.status) ? (
        <CampaignForm
          action={update}
          projectName={project.name}
          cancelHref="/dashboard/projects"
          submitLabel="Save campaign"
          availableCredits={Number(profile?.credits ?? 0)}
          currentReserved={Number(campaign.reserved_credits ?? 0)}
          spentCredits={Number(campaign.spent_credits ?? 0)}
          defaults={{
            title: campaign.title,
            testerGoal: campaign.tester_goal,
            durationDays: campaign.duration_days,
            minimumMinutes: campaign.minimum_minutes,
            rewardCredits: campaign.reward_credits,
            instructions: campaign.instructions,
            status: campaign.status
          }}
        />
      ) : (
        <div className="card p-6 text-soft">This campaign is closed. Its unused budget has been refunded and its settings can no longer be changed.</div>
      )}

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-black">Joined testers</h3>
          <span className="badge">Original budget {totalBudget}</span>
        </div>
        {(campaign.campaign_members ?? []).length === 0 ? (
          <p className="mt-3 text-soft">No testers have joined yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-white/10">
            {campaign.campaign_members.map((member) => {
              const tester = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
              return (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <span>{tester?.display_name || tester?.username || "Tester"}</span>
                  <span className="badge">{member.status.replaceAll("_", " ")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
