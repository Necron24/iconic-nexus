import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FeedbackForm } from "@/components/feedback-form";
import { TestSessionForm } from "@/components/test-session-form";
import { logTestSession, openFeedbackDispute, submitFeedback } from "@/app/dashboard/testing/actions";

export default async function TestingWorkspace({ params, searchParams }: { params: Promise<{ membershipId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { membershipId } = await params;
  const messages = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("campaign_members")
    .select("id,status,joined_at,submitted_at,approved_at,testing_campaigns!inner(id,title,instructions,minimum_minutes,reward_credits,projects!inner(name,slug,platform,testing_url,icon_url))")
    .eq("id", membershipId).eq("tester_id", user.id).maybeSingle();
  if (!membership) notFound();
  const campaign = Array.isArray(membership.testing_campaigns) ? membership.testing_campaigns[0] : membership.testing_campaigns;
  if (!campaign) notFound();
  const project = Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects;
  if (!project) notFound();

  const [{ data: sessions }, { data: report }, { data: dispute }] = await Promise.all([
    supabase.from("test_sessions").select("id,minutes_tested,device_name,os_version,notes,created_at").eq("campaign_member_id", membershipId).order("created_at", { ascending: false }),
    supabase.from("feedback_reports").select("id,overall_rating,developer_helpful,review_note,reviewed_at,review_due_at").eq("campaign_member_id", membershipId).maybeSingle(),
    supabase.from("feedback_disputes").select("id,status,reason,resolution_note,created_at,resolved_at").eq("campaign_member_id", membershipId).order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const total = (sessions ?? []).reduce((sum, s) => sum + s.minutes_tested, 0);
  const locked = ["submitted", "approved"].includes(membership.status);
  const changesRequested = membership.status === "in_progress" && Boolean(report?.review_note && report?.reviewed_at);
  const canAppeal = changesRequested && (!dispute || dispute.status === "resolved");

  return <div>
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Testing workspace</p><h2 className="mt-2 text-3xl font-black">{campaign.title}</h2><p className="mt-2 text-soft">{project.name} · {project.platform}</p></div>
      {project.testing_url && <a href={project.testing_url} target="_blank" rel="noreferrer" className="btn-primary gap-2">Open test link <ExternalLink size={17}/></a>}
    </div>

    {messages.success && <div className="mb-5 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">{messages.success}</div>}
    {messages.error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{messages.error}</div>}

    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="card p-5"><p className="text-sm text-soft">Status</p><p className="mt-2 text-2xl font-black capitalize">{membership.status.replaceAll("_"," ")}</p></div>
      <div className="card p-5"><p className="text-sm text-soft">Minutes logged</p><p className="mt-2 text-2xl font-black">{total}/{campaign.minimum_minutes}</p></div>
      <div className="card p-5"><p className="text-sm text-soft">Reward after approval</p><p className="mt-2 text-2xl font-black text-lime">{campaign.reward_credits}</p></div>
    </div>

    <div className="card mb-6 p-6"><h3 className="text-xl font-black">Testing instructions</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-soft">{campaign.instructions}</p></div>

    {membership.status === "submitted" && <div className="card mb-6 p-6">
      <p className="flex items-center gap-2 text-lg font-black text-cyan"><Clock3/> Feedback awaiting review</p>
      <p className="mt-3 text-soft">The developer can approve or request changes. If no action is taken by {report?.review_due_at ? new Date(report.review_due_at).toLocaleString("en-ZA") : "the review deadline"}, the report is eligible for automatic approval.</p>
    </div>}

    {membership.status === "approved" && <div className="card mb-6 p-6"><p className="flex items-center gap-2 text-lg font-black text-lime"><CheckCircle2/> Feedback approved</p><p className="mt-3 text-soft">The developer approved your report and your Nexus Credits were awarded.</p>{report?.review_note && <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-soft"><strong className="text-white">Developer note:</strong> {report.review_note}</p>}</div>}

    {changesRequested && <div className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-6">
      <p className="flex items-center gap-2 text-lg font-black text-amber-100"><AlertTriangle/> Changes requested</p>
      <p className="mt-3 text-amber-100/80">The developer returned your report. Update your feedback and submit it again.</p>
      <p className="mt-4 rounded-xl bg-black/20 p-4 text-sm text-amber-50"><strong>Developer reason:</strong> {report?.review_note}</p>
      {dispute?.status === "open" && <div className="mt-4 rounded-xl border border-cyan/30 bg-cyan/10 p-4 text-sm text-cyan">Your appeal is awaiting admin review.</div>}
      {dispute?.status === "resolved" && <div className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-soft"><strong className="text-white">Previous appeal decision:</strong> {dispute.resolution_note || "Resolved by an administrator."}</div>}
      {canAppeal && <form action={openFeedbackDispute.bind(null, membershipId)} className="mt-5">
        <label><span className="label flex items-center gap-2"><Scale size={16}/> Appeal this decision</span><textarea name="reason" required minLength={20} maxLength={2000} className="field min-h-28 resize-y" placeholder="Explain why your submitted test and feedback met the campaign requirements."/></label>
        <button className="btn-secondary mt-3">Submit appeal</button>
      </form>}
    </div>}

    {!locked && <div className="space-y-6"><TestSessionForm action={logTestSession.bind(null,membershipId)} /><FeedbackForm action={submitFeedback.bind(null,membershipId)} totalMinutes={total} minimumMinutes={campaign.minimum_minutes} /></div>}

    <div className="card mt-6 p-6"><h3 className="text-xl font-black">Session history</h3>{(sessions??[]).length===0?<p className="mt-3 text-soft">No sessions logged yet.</p>:<div className="mt-4 divide-y divide-white/10">{(sessions??[]).map(s=><div key={s.id} className="py-4"><div className="flex items-center justify-between gap-4"><p className="font-bold">{s.device_name}{s.os_version?` · ${s.os_version}`:""}</p><span className="flex items-center gap-2 text-sm text-cyan"><Clock3 size={15}/>{s.minutes_tested} min</span></div>{s.notes&&<p className="mt-2 text-sm text-soft">{s.notes}</p>}</div>)}</div>}</div>
    <Link href="/dashboard/testing" className="btn-secondary mt-6">Back to My Testing</Link>
  </div>;
}
