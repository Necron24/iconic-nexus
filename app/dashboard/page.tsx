import Link from "next/link";
import { Activity, Bell, Coins, FolderKanban, MessageSquareText, Plus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, projectsResult, completedTestsResult, campaignsResult, reviewsResult, activeTestsResult, unreadResult] = await Promise.all([
    supabase.from("profiles").select("credits, tester_reputation, display_name, username").eq("id", user.id).single(),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("campaign_members").select("id", { count: "exact", head: true }).eq("tester_id", user.id).eq("status", "approved"),
    supabase.from("testing_campaigns").select("id, title, tester_goal, campaign_members(count), projects!inner(owner_id)").eq("projects.owner_id", user.id).eq("status", "active").limit(1),
    supabase.from("campaign_members").select("id, testing_campaigns!inner(projects!inner(owner_id))", { count: "exact", head: true }).eq("testing_campaigns.projects.owner_id", user.id).eq("status", "submitted"),
    supabase.from("campaign_members").select("id", { count: "exact", head: true }).eq("tester_id", user.id).in("status", ["joined", "in_progress"]),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("profile_id", user.id).eq("is_read", false)
  ]);

  const profile = profileResult.data;
  const activeCampaign = campaignsResult.data?.[0];
  const joinedCount = Array.isArray(activeCampaign?.campaign_members) ? Number(activeCampaign.campaign_members[0]?.count ?? 0) : 0;
  const testerGoal = Number(activeCampaign?.tester_goal ?? 0);
  const progress = testerGoal > 0 ? Math.min(100, Math.round((joinedCount / testerGoal) * 100)) : 0;
  const pendingReviews = reviewsResult.count ?? 0;
  const activeTests = activeTestsResult.count ?? 0;
  const unread = unreadResult.count ?? 0;

  const stats = [
    [Coins, "Current credits", String(profile?.credits ?? 0)],
    [FolderKanban, "Your projects", String(projectsResult.count ?? 0)],
    [Activity, "Tests completed", String(completedTestsResult.count ?? 0)],
    [Star, "Tester reputation", Number(profile?.tester_reputation ?? 0).toFixed(1)]
  ] as const;
  const name = profile?.display_name || profile?.username || user.email || "Creator";

  return <>
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-soft">Welcome back</p><h2 className="mt-1 text-2xl font-black">{name}</h2></div><Link href="/dashboard/projects/new" className="btn-primary gap-2"><Plus size={18}/> Add project</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([Icon,label,value])=><div key={label} className="card p-5"><Icon className="text-lime" size={22}/><p className="mt-4 text-sm text-soft">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="card p-6"><h2 className="text-xl font-black">Campaign progress</h2>{activeCampaign?<><p className="mt-2 text-sm text-soft">{activeCampaign.title}</p><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan" style={{width:`${progress}%`}}/></div><p className="mt-2 text-sm text-soft">{joinedCount} of {testerGoal} testers joined</p></>:<div className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-sm text-soft">You do not have an active testing campaign yet.</div>}</div>
      <div className="card p-6"><h2 className="text-xl font-black">Next actions</h2><div className="mt-4 space-y-3 text-sm text-soft">
        {pendingReviews>0&&<Link href="/dashboard/projects" className="flex items-center justify-between rounded-xl bg-lime/10 p-4 text-lime hover:bg-lime/15"><span className="flex items-center gap-2"><MessageSquareText size={17}/> Review submitted feedback</span><strong>{pendingReviews}</strong></Link>}
        {activeTests>0&&<Link href="/dashboard/testing" className="flex items-center justify-between rounded-xl bg-white/5 p-4 hover:bg-white/10"><span>Continue your active tests</span><strong>{activeTests}</strong></Link>}
        {unread>0&&<Link href="/dashboard/notifications" className="flex items-center justify-between rounded-xl bg-white/5 p-4 hover:bg-white/10"><span className="flex items-center gap-2"><Bell size={17}/> Read notifications</span><strong>{unread}</strong></Link>}
        {(projectsResult.count??0)===0?<Link href="/dashboard/projects/new" className="block rounded-xl bg-white/5 p-4 hover:bg-white/10">Create your first app or game listing →</Link>:<><Link href="/dashboard/projects" className="block rounded-xl bg-white/5 p-4 hover:bg-white/10">Manage your projects →</Link><Link href="/discover" className="block rounded-xl bg-white/5 p-4 hover:bg-white/10">Find a project to test →</Link></>}
      </div></div>
    </div>
  </>;
}
