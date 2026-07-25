import Link from "next/link";
import {
  BarChart3,
  Bookmark,
  Download,
  Eye,
  Link2,
  MessageCircle,
  MousePointerClick,
  Share2,
  Sparkles,
  UserPlus,
  Users
} from "lucide-react";

export type CreatorAnalytics = {
  days: number;
  totals: {
    impressions: number;
    views: number;
    unique_visitors: number;
    link_clicks: number;
    shares: number;
    saves: number;
    follows: number;
    reactions: number;
    comments: number;
    campaign_joins: number;
  };
  series: Array<{
    day: string;
    impressions: number;
    views: number;
    engagements: number;
    conversions: number;
  }>;
  projects: Array<{
    id: string;
    slug: string;
    name: string;
    icon_url: string | null;
    impressions: number;
    views: number;
    engagements: number;
    conversions: number;
  }>;
  devlogs: Array<{
    id: string;
    title: string;
    update_type: string;
    project_name: string;
    impressions: number;
    views: number;
    engagements: number;
  }>;
  sources: Array<{ source: string; events: number }>;
  funnel: {
    impressions: number;
    views: number;
    link_clicks: number;
    campaign_joins: number;
  };
};

type LegacyStats = {
  active_campaigns?: number;
  approved_tests?: number;
  average_rating?: number;
  credits_spent?: number;
};

function number(value: unknown) {
  return Number(value ?? 0);
}

function percentage(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

export function CreatorAnalyticsDashboard({
  analytics,
  legacy,
  planName,
  planCode,
  selectedDays,
  allowedRanges
}: {
  analytics: CreatorAnalytics;
  legacy: LegacyStats;
  planName: string;
  planCode: string;
  selectedDays: number;
  allowedRanges: number[];
}) {
  const totals = analytics.totals;
  const interactions = number(totals.reactions) + number(totals.comments) + number(totals.saves) + number(totals.shares) + number(totals.follows);
  const ctr = percentage(number(totals.views), number(totals.impressions));
  const engagementRate = percentage(interactions, number(totals.views));
  const maxTrend = Math.max(1, ...analytics.series.map((row) => Math.max(number(row.impressions), number(row.views))));
  const labelEvery = Math.max(1, Math.ceil(analytics.series.length / 7));
  const funnel = [
    ["Impressions", number(analytics.funnel.impressions), "bg-cyan"],
    ["Content views", number(analytics.funnel.views), "bg-lime"],
    ["Link clicks", number(analytics.funnel.link_clicks), "bg-amber-300"],
    ["Campaign joins", number(analytics.funnel.campaign_joins), "bg-fuchsia-400"]
  ] as const;
  const funnelMax = Math.max(1, ...funnel.map((entry) => entry[1]));
  const metrics = [
    [BarChart3, "Impressions", totals.impressions, "Feed cards seen"],
    [Eye, "Content views", totals.views, `${ctr.toFixed(1)}% view rate`],
    [Users, "Unique visitors", totals.unique_visitors, "Privacy-safe daily visitors"],
    [MousePointerClick, "Link clicks", totals.link_clicks, "Release and testing links"],
    [UserPlus, "Campaign joins", totals.campaign_joins, "Completed join conversions"],
    [Sparkles, "Engagement rate", `${engagementRate.toFixed(1)}%`, `${interactions} total interactions`]
  ] as const;
  const engagement = [
    [Sparkles, "Reactions", totals.reactions],
    [MessageCircle, "Comments", totals.comments],
    [Bookmark, "Saves", totals.saves],
    [Share2, "Shares", totals.shares],
    [UserPlus, "New followers", totals.follows]
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Creator analytics</p>
          <h2 className="mt-2 text-3xl font-black">Content and conversion performance</h2>
          <p className="mt-2 text-soft">Plan: {planName}. Creator-owned visits are automatically excluded.</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Analytics date range">
          {[7, 30, 90, 365].map((days) => {
            const allowed = allowedRanges.includes(days);
            return allowed ? (
              <Link key={days} href={`/dashboard/analytics?days=${days}`} className={selectedDays === days ? "btn-primary !px-4 !py-2" : "btn-secondary !px-4 !py-2"}>
                {days === 365 ? "1 year" : `${days} days`}
              </Link>
            ) : (
              <span key={days} className="cursor-not-allowed rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white/30" title="Upgrade your plan to unlock this range">
                {days === 365 ? "1 year" : `${days} days`} · Locked
              </span>
            );
          })}
          {planCode === "studio" && <a href={`/api/analytics/export?days=${selectedDays}`} className="btn-secondary !px-4 !py-2 gap-2"><Download size={15} /> Export CSV</a>}
        </nav>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([Icon, label, value, helper]) => (
          <article key={label} className="card p-5">
            <Icon className="text-cyan" size={21} />
            <p className="mt-4 text-sm text-soft">{label}</p>
            <p className="mt-1 text-3xl font-black">{typeof value === "number" ? value.toLocaleString("en-ZA") : value}</p>
            <p className="mt-2 text-xs text-soft">{helper}</p>
          </article>
        ))}
      </div>

      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-xl font-black">Activity trend</h3><p className="mt-1 text-sm text-soft">Daily impressions and content views over the selected period.</p></div>
          <div className="flex gap-4 text-xs text-soft"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-cyan" /> Impressions</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-lime" /> Views</span></div>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex h-64 min-w-[680px] items-end gap-1 border-b border-white/10 px-1">
            {analytics.series.map((row, index) => (
              <div key={row.day} className="group relative flex h-full min-w-2 flex-1 items-end justify-center gap-px" title={`${row.day}: ${row.impressions} impressions, ${row.views} views`}>
                <span className="w-1/2 min-w-1 rounded-t-sm bg-cyan/75 transition group-hover:bg-cyan" style={{ height: `${Math.max(row.impressions ? 2 : 0, percentage(row.impressions, maxTrend) * 90)}%` }} />
                <span className="w-1/2 min-w-1 rounded-t-sm bg-lime/75 transition group-hover:bg-lime" style={{ height: `${Math.max(row.views ? 2 : 0, percentage(row.views, maxTrend) * 90)}%` }} />
                {(index % labelEvery === 0 || index === analytics.series.length - 1) && <span className="absolute -bottom-6 whitespace-nowrap text-[10px] text-soft">{new Date(row.day).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5 md:p-6">
          <h3 className="text-xl font-black">Conversion funnel</h3>
          <p className="mt-1 text-sm text-soft">How visibility becomes meaningful action.</p>
          <div className="mt-6 space-y-4">
            {funnel.map(([label, value, colour], index) => (
              <div key={label}>
                <div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-bold">{label}</span><span className="text-soft">{value.toLocaleString("en-ZA")}{index > 0 ? ` · ${percentage(value, funnel[index - 1][1]).toFixed(1)}%` : ""}</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${colour}`} style={{ width: `${Math.max(value ? 2 : 0, percentage(value, funnelMax))}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h3 className="text-xl font-black">Community engagement</h3>
          <p className="mt-1 text-sm text-soft">Signals showing what resonates with testers and followers.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {engagement.map(([Icon, label, value]) => <div key={label} className="rounded-xl bg-white/[0.04] p-4"><Icon className="text-lime" size={18} /><p className="mt-3 text-xs text-soft">{label}</p><p className="mt-1 text-2xl font-black">{number(value).toLocaleString("en-ZA")}</p></div>)}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="p-5 md:p-6"><h3 className="text-xl font-black">Top projects</h3><p className="mt-1 text-sm text-soft">Ranked by views in this period.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-y border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-soft"><tr><th className="px-5 py-3">Project</th><th className="px-3 py-3">Impressions</th><th className="px-3 py-3">Views</th><th className="px-3 py-3">Engagements</th><th className="px-5 py-3">Joins</th></tr></thead>
              <tbody>{analytics.projects.map((project) => <tr key={project.id} className="border-b border-white/[0.06]"><td className="px-5 py-4"><Link href={`/projects/${project.slug}`} className="font-bold hover:text-cyan">{project.name}</Link></td><td className="px-3 py-4">{number(project.impressions)}</td><td className="px-3 py-4">{number(project.views)}</td><td className="px-3 py-4">{number(project.engagements)}</td><td className="px-5 py-4">{number(project.conversions)}</td></tr>)}</tbody>
            </table>
            {analytics.projects.length === 0 && <p className="p-6 text-center text-soft">Create and publish a project to start collecting analytics.</p>}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="p-5 md:p-6"><h3 className="text-xl font-black">Top devlogs</h3><p className="mt-1 text-sm text-soft">See which updates attract attention and engagement.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-y border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-soft"><tr><th className="px-5 py-3">Devlog</th><th className="px-3 py-3">Impressions</th><th className="px-3 py-3">Views</th><th className="px-5 py-3">Engagements</th></tr></thead>
              <tbody>{analytics.devlogs.map((devlog) => <tr key={devlog.id} className="border-b border-white/[0.06]"><td className="px-5 py-4"><Link href={`/devlogs/${devlog.id}`} className="font-bold hover:text-cyan">{devlog.title}</Link><p className="mt-1 text-xs text-soft">{devlog.project_name}</p></td><td className="px-3 py-4">{number(devlog.impressions)}</td><td className="px-3 py-4">{number(devlog.views)}</td><td className="px-5 py-4">{number(devlog.engagements)}</td></tr>)}</tbody>
            </table>
            {analytics.devlogs.length === 0 && <p className="p-6 text-center text-soft">Publish a devlog to see content-level performance.</p>}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="card p-5 md:p-6">
          <h3 className="text-xl font-black">Traffic sources</h3>
          <div className="mt-5 space-y-3">
            {analytics.sources.map((source) => <div key={source.source} className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.04] p-3"><span className="flex min-w-0 items-center gap-2 truncate"><Link2 className="shrink-0 text-cyan" size={16} />{source.source === "iconic_nexus" ? "Iconic Nexus internal" : source.source}</span><strong>{source.events}</strong></div>)}
            {analytics.sources.length === 0 && <p className="text-sm text-soft">Traffic sources will appear after visitors open your content.</p>}
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h3 className="text-xl font-black">Testing performance</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[["Active campaigns", legacy.active_campaigns],["Approved tests", legacy.approved_tests],["Average rating", number(legacy.average_rating).toFixed(1)],["Credits spent", legacy.credits_spent]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white/[0.04] p-4"><p className="text-xs text-soft">{label}</p><p className="mt-2 text-2xl font-black">{String(value ?? 0)}</p></div>)}
          </div>
          <p className="mt-4 text-xs leading-5 text-soft">Impressions are counted after at least 55% of a card becomes visible. Views and events are deduplicated per signed-in user or anonymous daily visitor. Raw IP addresses are never stored.</p>
        </section>
      </div>

      {planCode === "free" && <div className="rounded-2xl border border-cyan/20 bg-cyan/[0.06] p-5"><strong>Unlock longer trends and advanced comparison ranges</strong><p className="mt-1 text-sm text-soft">Pro adds 90-day analytics. Studio adds a full year across your portfolio.</p><Link href="/dashboard/subscription" className="btn-primary mt-4">Compare plans</Link></div>}
    </div>
  );
}
