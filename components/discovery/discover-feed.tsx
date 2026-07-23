"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter, LoaderCircle, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProjectCard } from "@/components/project-card";

const PAGE_SIZE = 12;
const POLL_MS = 60000;

export type DiscoverProject = {
  id: string; slug: string; name: string; type: string; platform: string; stage: string;
  short_description: string; icon_url: string | null; cover_url: string | null;
  created_at: string; last_activity_at: string; active_campaign_count: number;
  approved_test_count: number; average_rating: number | null; owner_id: string;
  owner_username: string | null; owner_display_name: string | null; owner_avatar_url: string | null;
};
type Filters = { search: string; type: string; platform: string; stage: string; activeOnly: boolean; sort: string };
const initialFilters: Filters = { search: "", type: "", platform: "", stage: "", activeOnly: false, sort: "updated" };

function normalise(rows: DiscoverProject[]) {
  return rows.map((row) => ({ ...row, active_campaign_count: Number(row.active_campaign_count ?? 0), approved_test_count: Number(row.approved_test_count ?? 0), average_rating: row.average_rating === null ? null : Number(row.average_rating) }));
}
function unique(rows: DiscoverProject[]) { return Array.from(new Map(rows.map((row) => [row.id, row])).values()); }

export function DiscoverFeed({ initialProjects, currentUserId }: { initialProjects: DiscoverProject[]; currentUserId?: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const [projects, setProjects] = useState(normalise(initialProjects));
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [hasMore, setHasMore] = useState(initialProjects.length === PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const requestId = useRef(0);
  const projectIds = useRef(new Set(initialProjects.map((p) => p.id)));

  useEffect(() => { projectIds.current = new Set(projects.map((p) => p.id)); }, [projects]);

  const query = useCallback(async (offset: number, current: Filters) => {
    return supabase.rpc("browse_projects", { p_search: current.search.trim() || null, p_type: current.type || null, p_platform: current.platform || null, p_stage: current.stage || null, p_active_only: current.activeOnly, p_sort: current.sort, p_limit: PAGE_SIZE, p_offset: offset });
  }, [supabase]);

  const fetchProjects = useCallback(async (offset: number, replace: boolean, current: Filters) => {
    const id = ++requestId.current; setLoading(true); setError(null);
    const { data, error: rpcError } = await query(offset, current);
    if (id !== requestId.current) return;
    if (rpcError) { setError(rpcError.message); setLoading(false); return; }
    const rows = normalise((data ?? []) as DiscoverProject[]);
    setProjects((existing) => replace ? rows : unique([...existing, ...rows]));
    setHasMore(rows.length === PAGE_SIZE); setLoading(false); if (replace) setNewCount(0);
  }, [query]);

  const checkForUpdates = useCallback(async () => {
    if (loading || checking) return;
    setChecking(true);
    const { data, error: rpcError } = await query(0, applied);
    if (!rpcError) {
      const rows = normalise((data ?? []) as DiscoverProject[]);
      const unseen = rows.filter((row) => !projectIds.current.has(row.id)).length;
      setNewCount(unseen);
      // Also remove items that are no longer public when the user has only loaded one page.
      if (!hasMore && projects.length <= PAGE_SIZE) setProjects(rows);
    }
    setChecking(false);
  }, [applied, checking, hasMore, loading, projects.length, query]);

  const applyFilters = useCallback(() => { const next = { ...filters }; setApplied(next); void fetchProjects(0, true, next); }, [fetchProjects, filters]);
  const clearFilters = useCallback(() => { setFilters(initialFilters); setApplied(initialFilters); void fetchProjects(0, true, initialFilters); }, [fetchProjects]);
  const loadMore = useCallback(() => { if (!loading && hasMore) void fetchProjects(projects.length, false, applied); }, [applied, fetchProjects, hasMore, loading, projects.length]);
  const showNew = useCallback(() => { window.scrollTo({ top: 0, behavior: "smooth" }); void fetchProjects(0, true, applied); }, [applied, fetchProjects]);

  useEffect(() => { const node = sentinel.current; if (!node || !hasMore) return; const observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) loadMore(); }, { rootMargin: "500px 0px" }); observer.observe(node); return () => observer.disconnect(); }, [hasMore, loadMore]);
  useEffect(() => {
    const interval = window.setInterval(() => void checkForUpdates(), POLL_MS);
    const onFocus = () => void checkForUpdates();
    const onVisibility = () => { if (document.visibilityState === "visible") void checkForUpdates(); };
    window.addEventListener("focus", onFocus); window.addEventListener("online", onFocus); document.addEventListener("visibilitychange", onVisibility);
    const channel = supabase.channel("discover-live").on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => void checkForUpdates()).subscribe();
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onFocus); window.removeEventListener("online", onFocus); document.removeEventListener("visibilitychange", onVisibility); void supabase.removeChannel(channel); };
  }, [checkForUpdates, supabase]);

  return <>
    {newCount > 0 && <button type="button" onClick={showNew} className="sticky top-20 z-30 mx-auto mb-5 flex items-center gap-2 rounded-full border border-cyan/40 bg-[#07101f]/95 px-5 py-3 font-bold text-cyan shadow-2xl backdrop-blur"><RefreshCw size={17}/>{newCount} new project{newCount === 1 ? "" : "s"} available — show now</button>}
    <div className="card mb-8 p-5"><div className="grid gap-4 lg:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(130px,1fr))_auto]">
      <label className="relative"><span className="sr-only">Search projects</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft" size={18}/><input className="field pl-10" value={filters.search} onChange={(e)=>setFilters(v=>({...v,search:e.target.value}))} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();applyFilters();}}} placeholder="Search name, genre or platform"/></label>
      <select className="field" value={filters.type} onChange={(e)=>setFilters(v=>({...v,type:e.target.value}))}><option value="">All types</option><option value="game">Games</option><option value="app">Apps</option></select>
      <select className="field" value={filters.platform} onChange={(e)=>setFilters(v=>({...v,platform:e.target.value}))}><option value="">All platforms</option><option value="Android">Android</option><option value="Web">Web</option><option value="Windows">Windows</option><option value="iOS">iOS</option></select>
      <select className="field" value={filters.stage} onChange={(e)=>setFilters(v=>({...v,stage:e.target.value}))}><option value="">All stages</option><option value="prototype">Prototype</option><option value="alpha">Alpha</option><option value="beta">Beta</option><option value="released">Released</option></select>
      <select className="field" value={filters.sort} onChange={(e)=>setFilters(v=>({...v,sort:e.target.value}))}><option value="updated">Recently updated</option><option value="newest">Newest</option><option value="most_tested">Most tested</option><option value="highest_rated">Highest rated</option><option value="name">Name A–Z</option></select>
      <button type="button" onClick={applyFilters} disabled={loading} className="btn-primary gap-2 whitespace-nowrap disabled:opacity-50">{loading?<LoaderCircle className="animate-spin" size={17}/>:<Filter size={17}/>} Apply</button>
    </div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm text-soft"><input type="checkbox" className="h-4 w-4 accent-lime" checked={filters.activeOnly} onChange={(e)=>setFilters(v=>({...v,activeOnly:e.target.checked}))}/>Only projects that currently need testers</label><div className="flex items-center gap-4"><span className="text-xs text-soft">{checking ? "Checking for updates…" : "Live updates on"}</span><button type="button" onClick={clearFilters} className="flex items-center gap-2 text-sm font-bold text-cyan hover:text-white"><SlidersHorizontal size={16}/> Reset filters</button></div></div></div>
    {error&&<div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Projects could not be loaded: {error}</div>}
    {!loading&&projects.length===0?<div className="card p-10 text-center"><h2 className="text-2xl font-black">No matching projects</h2><p className="mx-auto mt-3 max-w-xl text-soft">Try a different search or clear some filters.</p></div>:<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{projects.map(project=><ProjectCard key={project.id} project={project} currentUserId={currentUserId}/>)}</div>}
    <div ref={sentinel} className="mt-8 flex min-h-20 items-center justify-center">{loading?<div className="flex items-center gap-3 text-soft"><LoaderCircle className="animate-spin" size={20}/> Loading more projects…</div>:hasMore?<button type="button" className="btn-secondary" onClick={loadMore}>Load more projects</button>:projects.length>0?<p className="text-sm text-soft">You have reached the end of the project list.</p>:null}</div>
  </>;
}
