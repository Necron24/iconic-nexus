import Link from "next/link";
import { AlertTriangle, BadgeDollarSign, Coins, FolderKanban, Gauge, Megaphone, ShieldCheck, UsersRound } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function Metric({ label, value, detail, icon: Icon, tone = "text-cyan" }: { label: string; value: string | number; detail: string; icon: React.ElementType; tone?: string }) {
  return <article className="card p-5">
    <div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.16em] text-soft">{label}</p><Icon size={20} className={tone}/></div>
    <p className="mt-3 text-3xl font-black">{value}</p><p className="mt-1 text-xs text-soft">{detail}</p>
  </article>;
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase text-soft">{children}</span>;
}

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [
    users, newUsers, projects, publishedProjects, campaigns, activeCampaigns, memberships, feedback,
    creditOrders, completedCreditOrders, subscriptionOrders, subscriptions, boosts, activeBoosts,
    openReports, openDisputes, recentUsers, recentOrders, recentCampaigns, recentBoosts
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    admin.from("projects").select("*", { count: "exact", head: true }),
    admin.from("projects").select("*", { count: "exact", head: true }).eq("is_published", true),
    admin.from("testing_campaigns").select("*", { count: "exact", head: true }),
    admin.from("testing_campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("campaign_members").select("*", { count: "exact", head: true }),
    admin.from("feedback_reports").select("*", { count: "exact", head: true }),
    admin.from("credit_purchase_orders").select("amount_zar,status"),
    admin.from("credit_purchase_orders").select("amount_zar", { count: "exact" }).eq("status", "complete"),
    admin.from("subscription_purchase_orders").select("amount_zar,status"),
    admin.from("profile_subscriptions").select("plan_code,status"),
    admin.from("content_boosts").select("*", { count: "exact", head: true }),
    admin.from("content_boosts").select("*", { count: "exact", head: true }).eq("status", "active").gt("ends_at", now.toISOString()),
    admin.from("reports").select("*", { count: "exact", head: true }).eq("resolved", false),
    admin.from("feedback_disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
    admin.from("profiles").select("id,username,display_name,role,account_status,credits,created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("credit_purchase_orders").select("id,credits,amount_zar,status,created_at,profiles(username,display_name)").order("created_at", { ascending: false }).limit(8),
    admin.from("testing_campaigns").select("id,title,status,tester_goal,reward_credits,created_at,projects(name)").order("created_at", { ascending: false }).limit(8),
    admin.from("content_boosts").select("id,target_type,boost_code,cost_credits,status,starts_at,ends_at,profiles!content_boosts_purchaser_id_fkey(username)").order("created_at", { ascending: false }).limit(8)
  ]);

  const creditRevenue = (completedCreditOrders.data ?? []).reduce((sum, row) => sum + Number(row.amount_zar ?? 0), 0);
  const subscriptionRevenue = (subscriptionOrders.data ?? []).filter(row => row.status === "complete").reduce((sum, row) => sum + Number(row.amount_zar ?? 0), 0);
  const pendingPayments = [...(creditOrders.data ?? []), ...(subscriptionOrders.data ?? [])].filter(row => row.status === "pending").length;
  const paidPlans = (subscriptions.data ?? []).filter(row => row.status === "active" && row.plan_code !== "free").length;
  const openSafety = Number(openReports.count ?? 0) + Number(openDisputes.count ?? 0);
  const queryErrors = [users, projects, campaigns, memberships, feedback, creditOrders, subscriptionOrders, subscriptions, boosts].filter(result => result.error);

  return <div className="space-y-8">
    {queryErrors.length > 0 && <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100"><AlertTriangle className="mr-2 inline" size={18}/>Some dashboard sources could not be loaded. No platform data was changed.</div>}

    <section>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-2xl font-black">Platform overview</h3><p className="mt-1 text-sm text-soft">Live operational totals, refreshed whenever this page loads.</p></div><p className="text-xs text-soft">Updated {now.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Users" value={users.count ?? 0} detail={`${newUsers.count ?? 0} joined in the last 7 days`} icon={UsersRound} tone="text-lime"/>
        <Metric label="Projects" value={projects.count ?? 0} detail={`${publishedProjects.count ?? 0} publicly visible`} icon={FolderKanban}/>
        <Metric label="Testing" value={activeCampaigns.count ?? 0} detail={`${memberships.count ?? 0} joins · ${feedback.count ?? 0} feedback reports`} icon={Gauge} tone="text-amber-200"/>
        <Metric label="Open safety items" value={openSafety} detail={`${openReports.count ?? 0} reports · ${openDisputes.count ?? 0} disputes`} icon={ShieldCheck} tone={openSafety ? "text-red-300" : "text-lime"}/>
        <Metric label="Credit revenue" value={`R${creditRevenue.toFixed(2)}`} detail={`${completedCreditOrders.count ?? 0} completed credit orders`} icon={Coins} tone="text-lime"/>
        <Metric label="Subscription revenue" value={`R${subscriptionRevenue.toFixed(2)}`} detail={`${paidPlans} active paid plans`} icon={BadgeDollarSign} tone="text-lime"/>
        <Metric label="Pending payments" value={pendingPayments} detail="Credit and subscription orders awaiting confirmation" icon={AlertTriangle} tone={pendingPayments ? "text-amber-200" : "text-lime"}/>
        <Metric label="Boosts" value={activeBoosts.count ?? 0} detail={`${boosts.count ?? 0} purchased in total`} icon={Megaphone}/>
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-2">
      <div className="card min-w-0 p-6"><h3 className="text-xl font-black">Newest users</h3><p className="mt-1 text-sm text-soft">Account state, role and available credits.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase text-soft"><tr><th className="pb-3">User</th><th className="pb-3">Role</th><th className="pb-3">Status</th><th className="pb-3 text-right">Credits</th></tr></thead><tbody className="divide-y divide-white/10">{(recentUsers.data ?? []).map((user: any) => <tr key={user.id}><td className="py-3"><p className="font-bold">{user.display_name || user.username}</p><p className="text-xs text-soft">@{user.username} · {new Date(user.created_at).toLocaleDateString("en-ZA")}</p></td><td className="py-3 capitalize">{user.role}</td><td className="py-3"><StatusPill>{user.account_status || "active"}</StatusPill></td><td className="py-3 text-right font-black">{user.credits}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card min-w-0 p-6"><h3 className="text-xl font-black">Recent payment orders</h3><p className="mt-1 text-sm text-soft">Read-only Paystack order trail. Refunds remain controlled through Paystack.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase text-soft"><tr><th className="pb-3">Customer</th><th className="pb-3">Order</th><th className="pb-3">Status</th><th className="pb-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-white/10">{(recentOrders.data ?? []).map((order: any) => { const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles; return <tr key={order.id}><td className="py-3"><p className="font-bold">@{profile?.username || "unknown"}</p><p className="text-xs text-soft">{new Date(order.created_at).toLocaleString("en-ZA")}</p></td><td className="py-3">{order.credits} credits</td><td className="py-3"><StatusPill>{order.status}</StatusPill></td><td className="py-3 text-right font-black">R{Number(order.amount_zar).toFixed(2)}</td></tr>; })}</tbody></table></div>
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-2">
      <div className="card min-w-0 p-6"><h3 className="text-xl font-black">Recent campaigns</h3><p className="mt-1 text-sm text-soft">Campaign pipeline and tester goals.</p><div className="mt-4 divide-y divide-white/10">{(recentCampaigns.data ?? []).map((campaign: any) => { const project = Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects; return <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold">{campaign.title}</p><p className="text-xs text-soft">{project?.name || "Project"} · Goal {campaign.tester_goal} · Reward {campaign.reward_credits}</p></div><StatusPill>{campaign.status}</StatusPill></div>; })}</div></div>
      <div className="card min-w-0 p-6"><h3 className="text-xl font-black">Recent boosts</h3><p className="mt-1 text-sm text-soft">Promotion purchases and expiry state.</p><div className="mt-4 divide-y divide-white/10">{(recentBoosts.data ?? []).map((boost: any) => { const profile = Array.isArray(boost.profiles) ? boost.profiles[0] : boost.profiles; return <div key={boost.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold">{String(boost.boost_code).replaceAll("_", " ")}</p><p className="text-xs text-soft">@{profile?.username || "unknown"} · {boost.target_type} · {boost.cost_credits} credits</p></div><StatusPill>{boost.status}</StatusPill></div>; })}</div></div>
    </section>

    <section className="card p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-xl font-black">Safety and moderation</h3><p className="mt-1 text-sm text-soft">Review reports, invalid tests, disputes, restricted users and hidden projects in the existing protected workflow.</p></div><Link href="/dashboard/admin/reports" className="btn-secondary">Open moderation centre</Link></div></section>
  </div>;
}
