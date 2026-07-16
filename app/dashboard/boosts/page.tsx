import { redirect } from "next/navigation";
import { Rocket, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buyBoost } from "./actions";

export default async function BoostsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, products, projects, campaigns, updates, active] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
    supabase.from("boost_products").select("code,name,description,target_type,cost_credits,duration_hours").eq("active", true).order("cost_credits"),
    supabase.from("projects").select("id,name").eq("owner_id", user.id).eq("is_published", true).order("name"),
    supabase.from("testing_campaigns").select("id,title,projects!inner(owner_id)").eq("projects.owner_id", user.id).in("status", ["active", "paused"]).order("created_at", { ascending: false }),
    supabase.from("project_updates").select("id,title,projects!inner(owner_id)").eq("projects.owner_id", user.id).eq("is_published", true).order("published_at", { ascending: false }),
    supabase.from("content_boosts").select("id,target_type,target_id,boost_code,starts_at,ends_at,status").eq("purchaser_id", user.id).order("created_at", { ascending: false }).limit(20)
  ]);

  const targetMap: Record<string, { id: string; label: string }[]> = {
    project: (projects.data ?? []).map((x: any) => ({ id: x.id, label: x.name })),
    campaign: (campaigns.data ?? []).map((x: any) => ({ id: x.id, label: x.title })),
    devlog: (updates.data ?? []).map((x: any) => ({ id: x.id, label: x.title }))
  };

  return <div className="space-y-6">
    <div className="card p-6">
      <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Promotion centre</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-3xl font-black">Boost your work</h2><p className="mt-2 text-soft">Use Nexus Credits for clearly labelled, time-limited promotion. Boosts never affect Wall of Fame rankings.</p></div>
        <div className="rounded-xl border border-lime/30 bg-lime/10 px-4 py-3"><span className="text-sm text-soft">Balance</span><strong className="ml-2 text-2xl text-lime">{profile.data?.credits ?? 0}</strong></div>
      </div>
    </div>
    {params.error && <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4 text-red-200">{params.error}</div>}
    {params.success && <div className="rounded-xl border border-lime/40 bg-lime/10 p-4 text-lime">{params.success}</div>}

    <div className="grid gap-5 lg:grid-cols-2">
      {(products.data ?? []).map((product: any) => {
        const targets = targetMap[product.target_type] ?? [];
        return <div className="card p-6" key={product.code}>
          <div className="flex items-start justify-between gap-4"><div><Rocket className="text-cyan"/><h3 className="mt-3 text-xl font-black">{product.name}</h3><p className="mt-2 text-sm text-soft">{product.description}</p></div><span className="rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-sm font-bold text-lime">{product.cost_credits} credits</span></div>
          <p className="mt-4 text-xs uppercase tracking-wider text-soft">Runs for {product.duration_hours} hours · labelled BOOSTED</p>
          {targets.length ? <form action={buyBoost} className="mt-5 flex gap-3">
            <input type="hidden" name="boostCode" value={product.code}/>
            <select name="targetId" required className="min-w-0 flex-1"><option value="">Choose {product.target_type}</option>{targets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
            <button className="btn-primary" type="submit">Activate</button>
          </form> : <p className="mt-5 rounded-lg border border-dashed border-white/15 p-3 text-sm text-soft">No eligible {product.target_type}s yet.</p>}
        </div>;
      })}
    </div>

    <div className="card p-6"><div className="flex items-center gap-2"><Zap className="text-lime"/><h2 className="text-2xl font-black">Your boost history</h2></div>
      {(active.data ?? []).length ? <div className="mt-4 divide-y divide-white/10">{(active.data ?? []).map((b: any) => <div key={b.id} className="flex flex-wrap justify-between gap-3 py-4"><div><p className="font-bold">{b.boost_code.replaceAll("_", " ")}</p><p className="text-xs text-soft">{b.target_type} · {b.status}</p></div><p className="text-sm text-soft">Ends {new Date(b.ends_at).toLocaleString("en-ZA", { dateStyle:"medium", timeStyle:"short" })}</p></div>)}</div> : <p className="mt-4 text-soft">No boosts purchased yet.</p>}
    </div>
  </div>;
}
