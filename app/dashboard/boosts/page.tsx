import { redirect } from "next/navigation";
import { Rocket, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buyBoost } from "./actions";

export default async function BoostsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, products, projects, campaigns, updates, active, performance] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
    supabase.from("boost_products").select("code,name,description,target_type,cost_credits,duration_hours").eq("active", true).order("cost_credits"),
    supabase.from("projects").select("id,name").eq("owner_id", user.id).eq("is_published", true).order("name"),
    supabase.from("testing_campaigns").select("id,title,projects!inner(owner_id)").eq("projects.owner_id", user.id).in("status", ["active", "paused"]).order("created_at", { ascending: false }),
    supabase.from("project_updates").select("id,title,projects!inner(owner_id)").eq("projects.owner_id", user.id).eq("is_published", true).order("published_at", { ascending: false }),
    supabase.from("content_boosts").select("id,target_type,target_id,boost_code,starts_at,ends_at,status").eq("purchaser_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.rpc("get_own_boost_performance")
  ]);

  const activeBoosts = (active.data ?? []).filter((boost: any) =>
    boost.status === "active" && new Date(boost.ends_at).getTime() > Date.now()
  );
  const activeByTarget = new Map(activeBoosts.map((boost: any) => [`${boost.target_type}:${boost.target_id}`, boost]));
  const performanceByBoost = new Map((performance.data ?? []).map((row: any) => [row.boost_id, row]));

  const targetMap: Record<string, { id: string; label: string }[]> = {
    project: (projects.data ?? []).map((x: any) => ({ id: x.id, label: x.name })),
    campaign: (campaigns.data ?? []).map((x: any) => ({ id: x.id, label: x.title })),
    devlog: (updates.data ?? []).map((x: any) => ({ id: x.id, label: x.title }))
  };

  return <div className="space-y-6">
    <div className="card p-6">
      <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Promotion centre</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-3xl font-black">Boost your work</h2><p className="mt-2 text-soft">Use Nexus Credits for clearly labelled, time-limited sponsored promotion. Boosts never affect Wall of Fame rankings.</p></div>
        <div className="rounded-xl border border-lime/30 bg-lime/10 px-4 py-3"><span className="text-sm text-soft">Balance</span><strong className="ml-2 text-2xl text-lime">{profile.data?.credits ?? 0}</strong></div>
      </div>
    </div>
    {params.error && <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-red-200">{params.error}</div>}
    {params.success && <div className="rounded-xl border border-lime/40 bg-lime/10 p-4 text-lime">{params.success}</div>}

    <div className="grid gap-5 lg:grid-cols-2">
      {(products.data ?? []).map((product: any) => {
        const targets = targetMap[product.target_type] ?? [];
        return <div className="card min-w-0 p-6" key={product.code}>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between"><div className="min-w-0"><Rocket className="text-cyan"/><h3 className="mt-3 text-xl font-black">{product.name}</h3><p className="mt-2 text-sm text-soft">{product.description}</p></div><span className="shrink-0 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-sm font-bold text-lime">{product.cost_credits} credits</span></div>
          <p className="mt-4 text-xs uppercase tracking-wider text-soft">Runs for {product.duration_hours} hours · labelled SPONSORED</p>
          {targets.length ? (
            <div className="mt-5 space-y-3">
              {targets.some((target) => activeByTarget.has(`${product.target_type}:${target.id}`)) && (
                <div className="rounded-xl border border-lime/30 bg-lime/10 p-3 text-sm text-lime">
                  {targets.filter((target) => activeByTarget.has(`${product.target_type}:${target.id}`)).map((target) => {
                    const boost: any = activeByTarget.get(`${product.target_type}:${target.id}`);
                    return <p key={target.id}><strong>{target.label}</strong> is boosted until {new Date(boost.ends_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>;
                  })}
                </div>
              )}
              <form action={buyBoost} className="flex min-w-0 flex-col gap-3 sm:flex-row">
                <input type="hidden" name="boostCode" value={product.code}/>
                <select name="targetId" required className="min-w-0 flex-1">
                  <option value="">Choose {product.target_type}</option>
                  {targets.map((target) => {
                    const activeBoost: any = activeByTarget.get(`${product.target_type}:${target.id}`);
                    return <option key={target.id} value={target.id} disabled={Boolean(activeBoost)}>{target.label}{activeBoost ? " — already boosted" : ""}</option>;
                  })}
                </select>
                <button className="btn-primary w-full sm:w-auto" type="submit">Activate</button>
              </form>
            </div>
          ) : <p className="mt-5 rounded-lg border border-dashed border-white/15 p-3 text-sm text-soft">No eligible {product.target_type}s yet.</p>}
        </div>;
      })}
    </div>

    <div className="card p-6"><div className="flex items-center gap-2"><Zap className="text-lime"/><h2 className="text-2xl font-black">Your boost history</h2></div>
      {(active.data ?? []).length ? <div className="mt-4 divide-y divide-white/10">{(active.data ?? []).map((b: any) => {
        const stats: any = performanceByBoost.get(b.id) ?? {};
        return <div key={b.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-bold">{b.boost_code.replaceAll("_", " ")}</p><p className="text-xs text-soft">{b.target_type} · {b.status} · Ends {new Date(b.ends_at).toLocaleString("en-ZA", { dateStyle:"medium", timeStyle:"short" })}</p></div><div className="flex flex-wrap gap-2 text-xs"><span className="badge">{Number(stats.impressions ?? 0)} impressions</span><span className="badge">{Number(stats.views ?? 0)} views</span><span className="badge">{Number(stats.link_clicks ?? 0)} clicks</span><span className="badge">{Number(stats.engagements ?? 0)} engagements</span>{b.target_type === "campaign" && <span className="badge">{Number(stats.conversions ?? 0)} joins</span>}</div></div>;
      })}</div> : <p className="mt-4 text-soft">No boosts purchased yet.</p>}
    </div>
  </div>;
}
