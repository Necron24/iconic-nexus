import { redirect } from "next/navigation";
import { Check, Crown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: plans }, { data: currentRows }, { data: subscription }] = await Promise.all([
    supabase.from("subscription_plans").select("*").eq("active", true).order("sort_order"),
    supabase.rpc("current_plan", { p_profile_id: user.id }),
    supabase.from("profile_subscriptions")
      .select("plan_code,status,current_period_end,cancel_at_period_end,next_payment_date")
      .eq("profile_id", user.id)
      .maybeSingle()
  ]);
  const current = Array.isArray(currentRows) ? currentRows[0] : currentRows;
  return <div className="space-y-6">
    <div><p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Membership</p><h2 className="mt-2 text-3xl font-black">Choose your Iconic Nexus plan</h2><p className="mt-2 text-soft">Your current plan is <strong className="text-white">{current?.plan_name ?? "Free"}</strong>.</p></div>
    {query.error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{query.error}</div>}
    {query.success && <div className="rounded-xl border border-lime/30 bg-lime/10 p-4 text-lime">{query.success}</div>}
    {subscription?.plan_code !== "free" && <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold">Subscription status: <span className="capitalize text-lime">{subscription?.status ?? "active"}</span></p>
          <p className="mt-1 text-sm text-soft">
            {subscription?.cancel_at_period_end
              ? "Cancellation is scheduled. Paystack will not charge this subscription again."
              : `Next billing date: ${subscription?.next_payment_date ? new Date(subscription.next_payment_date).toLocaleDateString("en-ZA") : "waiting for Paystack confirmation"}`}
          </p>
        </div>
        {!subscription?.cancel_at_period_end && <form action="/api/paystack/subscription-cancel" method="post">
          <button className="btn-secondary">Cancel subscription</button>
        </form>}
      </div>
    </div>}
    <div className="grid gap-5 lg:grid-cols-3">{(plans ?? []).map((plan) => {
      const active = plan.code === current?.plan_code;
      const features = [`${plan.active_campaign_limit} active campaign${plan.active_campaign_limit === 1 ? "" : "s"}`, plan.private_campaigns ? "Private testing campaigns" : "Public campaigns", `${plan.team_member_limit} team seat${plan.team_member_limit === 1 ? "" : "s"}`, plan.advanced_analytics ? "Advanced analytics" : "Basic dashboard", `${plan.monthly_bonus_credits} monthly bonus credits`];
      return <article key={plan.code} className={`card p-6 ${active ? "ring-2 ring-lime/60" : ""}`}>
        <div className="flex items-center justify-between"><div className="flex items-center gap-3">{plan.code === "studio" ? <Users className="text-cyan"/> : <Crown className="text-lime"/>}<h3 className="text-xl font-black">{plan.name}</h3></div>{active && <span className="badge border-lime/30 text-lime">Current</span>}</div>
        <p className="mt-5 text-4xl font-black">R{Number(plan.monthly_price_zar).toFixed(0)}<span className="text-sm font-medium text-soft"> / month</span></p>
        <ul className="mt-5 space-y-3">{features.map((f) => <li key={f} className="flex gap-2 text-sm text-soft"><Check size={18} className="shrink-0 text-lime"/>{f}</li>)}</ul>
        {plan.code === "free" ? <div className="mt-6 rounded-xl border border-white/10 p-3 text-center text-sm text-soft">Included for every account</div> : <form action="/api/paystack/subscription-checkout" method="post" className="mt-6"><input type="hidden" name="planCode" value={plan.code}/><button className="btn-primary w-full" disabled={active}>{active ? "Current plan" : `Choose ${plan.name}`}</button></form>}
      </article>;
    })}</div>
    <p className="text-xs text-soft">Subscription activation and recurring payments are confirmed by secure Paystack server notifications. Keep Paystack in test mode until the full checkout and renewal flow has been tested.</p>
  </div>;
}
