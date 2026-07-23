import { redirect } from "next/navigation";
import { Ban, EyeOff, Scale, ShieldCheck, UserRoundX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveDispute, resolveInvalidTest, resolveReport, setProjectVisibility, setUserStatus } from "./actions";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: admin } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!admin?.is_admin) redirect("/dashboard");

  const [{ data: reports }, { data: disputes }, { data: invalidTests }, { data: users }, { data: projects }] = await Promise.all([
    supabase.from("reports").select("id,target_type,target_id,reason,details,resolved,resolution_note,created_at,profiles!reports_reporter_id_fkey(username)").order("created_at", { ascending: false }).limit(100),
    supabase.from("feedback_disputes").select("id,status,reason,resolution_note,created_at,campaign_member_id,profiles!feedback_disputes_opened_by_fkey(username,display_name),campaign_members!inner(id,tester_id,testing_campaigns!inner(id,title,reward_credits,projects!inner(id,name,owner_id)))").order("created_at", { ascending: false }).limit(100),
    supabase.rpc("admin_list_invalid_test_reports"),
    supabase.from("profiles").select("id,username,display_name,account_status,suspension_reason,is_admin").order("created_at", { ascending: false }).limit(50),
    supabase.from("projects").select("id,name,slug,moderation_status,moderation_reason,profiles!projects_owner_id_fkey(username)").order("created_at", { ascending: false }).limit(50)
  ]);

  return <div>
    <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Administration</p>
    <h2 className="mt-2 text-3xl font-black">Safety and moderation</h2>
    <p className="mt-2 text-soft">Review disputes, reports, users and project visibility.</p>
    {params.error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{params.error}</div>}

    <section className="mt-8">
      <h3 className="flex items-center gap-2 text-2xl font-black"><ShieldCheck className="text-red-300"/> Invalid-test reviews</h3>
      <p className="mt-2 text-soft">Developers cannot reject submitted feedback themselves. Review the campaign requirements, submitted feedback and developer evidence before deciding.</p>
      <div className="mt-4 space-y-4">
        {(invalidTests || []).length === 0 && <div className="card p-6 text-soft">No invalid-test reports yet.</div>}
        {(invalidTests || []).map((r: any) => {
          return <article key={r.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black">{r.project_name || "Project"} · {r.campaign_title || "Campaign"}</p>
                <p className="mt-1 text-sm text-soft">
                  Developer: {r.developer_display_name || r.developer_username || "unknown"} · Tester: {r.tester_display_name || r.tester_username || "unknown"} · Reward {r.reward_credits || 0}
                </p>
                <p className="mt-1 text-xs text-soft">Submitted {new Date(r.created_at).toLocaleString("en-ZA")}</p>
              </div>
              <span className="badge capitalize">{r.status}</span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-red-200">Developer report</p>
                <p className="mt-2 font-bold capitalize">{String(r.category).replaceAll("_", " ")}</p>
                <p className="mt-3 whitespace-pre-wrap text-soft">{r.reason}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan">Campaign requirements</p>
                <p className="mt-3 whitespace-pre-wrap text-soft">{r.campaign_instructions || "No instructions available."}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-lime">Submitted feedback</p>
                <p className="mt-3 text-sm font-bold text-white">What worked</p>
                <p className="mt-1 whitespace-pre-wrap text-soft">{r.what_worked || "Not supplied."}</p>
                <p className="mt-3 text-sm font-bold text-white">What was confusing</p>
                <p className="mt-1 whitespace-pre-wrap text-soft">{r.what_was_confusing || "Not supplied."}</p>
                {r.bug_details && <><p className="mt-3 text-sm font-bold text-white">Bug details</p><p className="mt-1 whitespace-pre-wrap text-soft">{r.bug_details}</p></>}
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Testing evidence</p>
                <p className="mt-3 text-soft">Logged time: <strong className="text-white">{r.total_minutes || 0} minutes</strong></p>
                <p className="mt-2 text-soft">Sessions: <strong className="text-white">{r.session_count || 0}</strong></p>
                <a href={`/dashboard/testing/${r.campaign_member_id}`} className="btn-secondary mt-4 inline-flex">Open full test record</a>
              </div>
            </div>

            {r.status === "open" ? <form action={resolveInvalidTest} className="mt-5 space-y-4">
              <input type="hidden" name="invalidReportId" value={r.id}/>
              <label><span className="label">Admin resolution</span><textarea name="resolutionNote" required minLength={10} maxLength={2000} className="field min-h-28 resize-y" placeholder="Explain why the test is valid or invalid."/></label>
              <div className="flex flex-wrap gap-3">
                <button name="decision" value="approve_tester" className="btn-primary">Approve tester and pay reward</button>
                <button name="decision" value="uphold_invalid" className="btn-secondary">Uphold invalid-test report</button>
              </div>
            </form> : <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-soft"><strong className="text-white">Resolution:</strong> {r.resolution_note || r.resolution || "Resolved"}</p>}
          </article>;
        })}
      </div>
    </section>

    <section className="mt-10">
      <h3 className="flex items-center gap-2 text-2xl font-black"><Scale className="text-cyan"/> Feedback disputes</h3>
      <div className="mt-4 space-y-4">
        {(disputes || []).length === 0 && <div className="card p-6 text-soft">No disputes yet.</div>}
        {(disputes || []).map((d: any) => {
          const opener = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
          const member = Array.isArray(d.campaign_members) ? d.campaign_members[0] : d.campaign_members;
          const campaign = Array.isArray(member?.testing_campaigns) ? member.testing_campaigns[0] : member?.testing_campaigns;
          const project = Array.isArray(campaign?.projects) ? campaign.projects[0] : campaign?.projects;
          return <article key={d.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xl font-black">{project?.name || "Project"} · {campaign?.title || "Campaign"}</p><p className="mt-1 text-sm text-soft">Opened by {opener?.display_name || opener?.username || "tester"} · Reward {campaign?.reward_credits || 0} · {new Date(d.created_at).toLocaleString("en-ZA")}</p></div><span className="badge capitalize">{d.status}</span></div>
            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-soft">{d.reason}</p>
            {d.status === "open" ? <form action={resolveDispute} className="mt-5 space-y-4"><input type="hidden" name="disputeId" value={d.id}/><label><span className="label">Admin resolution</span><textarea name="resolutionNote" required minLength={10} maxLength={2000} className="field min-h-28 resize-y"/></label><div className="flex flex-wrap gap-3"><button name="decision" value="approve_tester" className="btn-primary">Approve tester and pay reward</button><button name="decision" value="uphold_developer" className="btn-secondary">Uphold developer decision</button></div></form> : <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-soft"><strong className="text-white">Resolution:</strong> {d.resolution_note || "Resolved"}</p>}
          </article>;
        })}
      </div>
    </section>

    <section className="mt-10">
      <h3 className="flex items-center gap-2 text-2xl font-black"><ShieldCheck className="text-lime"/> Content reports</h3>
      <div className="mt-4 space-y-4">{(reports || []).length === 0 ? <div className="card p-6 text-soft">No reports.</div> : (reports || []).map((r: any) => {
        const reporter = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return <article key={r.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{r.target_type} report · {r.reason}</p><p className="mt-1 text-sm text-soft">Reporter: {reporter?.username || "unknown"} · Target: {r.target_id}</p></div><span className="badge">{r.resolved ? "Resolved" : "Open"}</span></div>{r.details && <p className="mt-4 whitespace-pre-wrap text-soft">{r.details}</p>}{!r.resolved && <form action={resolveReport} className="mt-4"><input type="hidden" name="id" value={r.id}/><textarea name="resolutionNote" className="field min-h-20 resize-y" placeholder="Resolution note"/><button className="btn-secondary mt-3">Resolve report</button></form>}</article>;
      })}</div>
    </section>

    <section className="mt-10 grid gap-6 xl:grid-cols-2">
      <div><h3 className="flex items-center gap-2 text-2xl font-black"><UserRoundX className="text-red-300"/> User controls</h3><div className="mt-4 space-y-3">{(users || []).map((u: any) => <article key={u.id} className="card p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{u.display_name || u.username}</p><p className="text-sm text-soft">@{u.username} · {u.account_status}</p></div>{u.is_admin && <span className="badge">Admin</span>}</div>{!u.is_admin && <form action={setUserStatus} className="mt-4 grid gap-3"><input type="hidden" name="userId" value={u.id}/><select name="status" defaultValue={u.account_status || "active"} className="field"><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select><input name="reason" defaultValue={u.suspension_reason || ""} className="field" placeholder="Reason"/><button className="btn-secondary gap-2"><Ban size={16}/> Update user status</button></form>}</article>)}</div></div>
      <div><h3 className="flex items-center gap-2 text-2xl font-black"><EyeOff className="text-amber-300"/> Project controls</h3><div className="mt-4 space-y-3">{(projects || []).map((p: any) => { const owner = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles; return <article key={p.id} className="card p-4"><p className="font-black">{p.name}</p><p className="text-sm text-soft">Owner: @{owner?.username || "unknown"} · {p.moderation_status}</p><form action={setProjectVisibility} className="mt-4 grid gap-3"><input type="hidden" name="projectId" value={p.id}/><input type="hidden" name="hidden" value={p.moderation_status === "hidden" ? "false" : "true"}/><input name="reason" defaultValue={p.moderation_reason || ""} className="field" placeholder="Moderation reason"/><button className="btn-secondary">{p.moderation_status === "hidden" ? "Restore project" : "Hide project"}</button></form></article>; })}</div></div>
    </section>
  </div>;
}
