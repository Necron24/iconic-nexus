"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, Coins, Filter, LoaderCircle, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 10;

export type BrowseCampaign = {
  id: string;
  title: string;
  minimum_minutes: number;
  tester_goal: number;
  reward_credits: number;
  duration_days: number;
  ends_at: string | null;
  created_at: string;
  project_name: string;
  project_slug: string;
  platform: string;
  stage: string;
  short_description: string;
  icon_url: string | null;
  joined_count: number;
};

type Filters = { search: string; platform: string; stage: string; sort: string };
const defaults: Filters = { search: "", platform: "", stage: "", sort: "newest" };

export function CampaignFeed({ initialCampaigns }: { initialCampaigns: BrowseCampaign[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [filters, setFilters] = useState(defaults);
  const [applied, setApplied] = useState(defaults);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCampaigns.length === PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const requestId = useRef(0);

  const fetchRows = useCallback(async (offset: number, replace: boolean, current: Filters) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("browse_campaigns", {
      p_search: current.search.trim() || null,
      p_platform: current.platform || null,
      p_stage: current.stage || null,
      p_sort: current.sort,
      p_limit: PAGE_SIZE,
      p_offset: offset
    });
    if (id !== requestId.current) return;
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    const rows = ((data ?? []) as BrowseCampaign[]).map((row) => ({ ...row, joined_count: Number(row.joined_count ?? 0) }));
    setCampaigns((currentRows) => replace ? rows : [...currentRows, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, [supabase]);

  const apply = useCallback(() => {
    const next = { ...filters };
    setApplied(next);
    void fetchRows(0, true, next);
  }, [fetchRows, filters]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    void fetchRows(campaigns.length, false, applied);
  }, [applied, campaigns.length, fetchRows, hasMore, loading]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "500px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="card mb-8 grid gap-4 p-5 md:grid-cols-[minmax(240px,1.5fr)_1fr_1fr_1fr_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft" size={18} />
          <input className="field pl-10" placeholder="Search campaigns or projects" value={filters.search} onChange={(e) => setFilters((v) => ({ ...v, search: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} />
        </label>
        <select className="field" value={filters.platform} onChange={(e) => setFilters((v) => ({ ...v, platform: e.target.value }))}>
          <option value="">All platforms</option><option value="Android">Android</option><option value="Web">Web</option><option value="Windows">Windows</option><option value="iOS">iOS</option>
        </select>
        <select className="field" value={filters.stage} onChange={(e) => setFilters((v) => ({ ...v, stage: e.target.value }))}>
          <option value="">All stages</option><option value="prototype">Prototype</option><option value="alpha">Alpha</option><option value="beta">Beta</option><option value="released">Released</option>
        </select>
        <select className="field" value={filters.sort} onChange={(e) => setFilters((v) => ({ ...v, sort: e.target.value }))}>
          <option value="newest">Newest</option><option value="ending_soon">Ending soon</option><option value="highest_reward">Highest reward</option><option value="spaces_left">Most spaces left</option>
        </select>
        <button type="button" className="btn-primary gap-2" onClick={apply}><Filter size={17} /> Apply</button>
      </div>

      {error && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Campaigns could not be loaded: {error}</div>}

      {!loading && campaigns.length === 0 ? (
        <div className="card p-10 text-center"><h2 className="text-2xl font-black">No matching active campaigns</h2><p className="mt-3 text-soft">Try another filter or check again later.</p></div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const joined = Number(campaign.joined_count ?? 0);
            const percentage = Math.min(100, Math.round((joined / campaign.tester_goal) * 100));
            const daysLeft = campaign.ends_at ? Math.max(0, Math.ceil((new Date(campaign.ends_at).getTime() - Date.now()) / 86400000)) : campaign.duration_days;
            return (
              <article key={campaign.id} className="card grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex gap-4">
                  {campaign.icon_url ? <img src={campaign.icon_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-lime text-2xl font-black text-ink">{campaign.project_name.charAt(0).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2"><span className="badge">{campaign.platform}</span><span className="badge">{campaign.stage}</span></div>
                    <h2 className="text-2xl font-black">{campaign.title}</h2>
                    <p className="mt-1 font-semibold text-white/80">{campaign.project_name}</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-soft">{campaign.short_description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-soft">
                      <span className="flex items-center gap-2"><Users size={16} /> {joined}/{campaign.tester_goal} testers</span>
                      <span className="flex items-center gap-2"><CalendarDays size={16} /> {daysLeft} days left</span>
                      <span className="flex items-center gap-2"><Clock3 size={16} /> {campaign.minimum_minutes}+ min</span>
                      <span className="flex items-center gap-2"><Coins size={16} /> {campaign.reward_credits} credits</span>
                    </div>
                    <div className="mt-4 h-2 max-w-xl overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan" style={{ width: `${percentage}%` }} /></div>
                  </div>
                </div>
                <Link href={`/campaigns/${campaign.id}`} className="btn-secondary">View campaign</Link>
              </article>
            );
          })}
        </div>
      )}

      <div ref={sentinel} className="mt-8 flex min-h-20 items-center justify-center">
        {loading ? <div className="flex items-center gap-3 text-soft"><LoaderCircle className="animate-spin" size={20} /> Loading more campaigns…</div> : hasMore ? <button type="button" onClick={loadMore} className="btn-secondary">Load more campaigns</button> : campaigns.length > 0 ? <p className="text-sm text-soft">You have reached the end of the active campaigns.</p> : null}
      </div>
    </>
  );
}
