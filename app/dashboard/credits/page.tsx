import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Coins, PiggyBank } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string, string> = {
  welcome: "Welcome credits",
  test_reward: "Approved test reward",
  helpful_bonus: "Helpful feedback bonus",
  bug_bonus: "Confirmed bug bonus",
  campaign_cost: "Campaign budget reserved",
  refund: "Unused campaign budget returned",
  admin_adjustment: "Account adjustment"
};

export default async function DashboardCreditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, transactionsResult, campaignsResult] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
    supabase.from("credit_transactions")
      .select("id, amount, transaction_type, note, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("testing_campaigns")
      .select("reserved_credits, projects!inner(owner_id)")
      .eq("projects.owner_id", user.id)
      .in("status", ["draft", "active", "paused"])
  ]);

  const balance = Number(profileResult.data?.credits ?? 0);
  const reserved = (campaignsResult.data ?? []).reduce((sum, campaign) => sum + Number(campaign.reserved_credits ?? 0), 0);
  const transactions = transactionsResult.data ?? [];
  const earned = transactions.filter((transaction) => transaction.amount > 0).reduce((sum, transaction) => sum + transaction.amount, 0);
  const spent = Math.abs(transactions.filter((transaction) => transaction.amount < 0).reduce((sum, transaction) => sum + transaction.amount, 0));

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <div className="space-y-5">
        <div className="card p-6">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Available balance</p>
          <div className="mt-4 flex items-center gap-3">
            <Coins className="text-lime" size={34} />
            <p className="text-5xl font-black text-lime">{balance}</p>
          </div>
          <p className="mt-2 text-soft">Nexus Credits ready to use</p>
          <Link href="/campaigns" className="btn-primary mt-6 w-full">Earn credits by testing</Link>
        </div>

        <div className="card p-5">
          <PiggyBank className="text-cyan" size={22} />
          <p className="mt-3 text-xs text-soft">Reserved for active campaigns</p>
          <p className="mt-1 text-3xl font-black">{reserved}</p>
          <p className="mt-2 text-xs text-soft">Unused reserved credits are returned when a campaign is completed or cancelled.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card p-5">
            <ArrowDownLeft className="text-lime" size={21} />
            <p className="mt-3 text-xs text-soft">Total received</p>
            <p className="mt-1 text-2xl font-black">{earned}</p>
          </div>
          <div className="card p-5">
            <ArrowUpRight className="text-cyan" size={21} />
            <p className="mt-3 text-xs text-soft">Total reserved/spent</p>
            <p className="mt-1 text-2xl font-black">{spent}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-2xl font-black">Transaction history</h2>
        <p className="mt-2 text-sm text-soft">Every reward, campaign reservation and refund is recorded here.</p>

        {transactions.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-white/15 p-8 text-center text-soft">No transactions yet.</div>
        ) : (
          <div className="mt-5 divide-y divide-white/10">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold">{transaction.note || labels[transaction.transaction_type] || transaction.transaction_type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-soft">{new Date(transaction.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <p className={`text-lg font-black ${transaction.amount > 0 ? "text-lime" : "text-white"}`}>
                  {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
