import Link from "next/link";
import { Award, Crown, FolderKanban, Medal, Sparkles, Star, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Person = {
  rank: number; id: string; username: string; display_name: string | null; avatar_url: string | null;
  tester_reputation?: number; approved_tests?: number; helpful_feedback?: number; approval_rate?: number | null;
  published_projects?: number; approved_tests_received?: number; average_rating?: number | null; devlog_count?: number; developer_reputation?: number;
  monthly_tests?: number; community_score?: number; badge?: string;
};
type Project = {
  rank: number; id: string; slug: string; name: string; icon_url: string | null; platform: string;
  approved_tests?: number; monthly_tests?: number; average_rating: number | null; devlog_count?: number; monthly_devlogs?: number; badge?: string;
};
type FameData = { testers: Person[]; developers: Person[]; projects: Project[]; monthly_projects: Project[]; monthly_testers: Person[]; community_champions: Person[] };

function RankBadge({ rank }: { rank: number }) {
  const style = rank === 1 ? "bg-amber-300 text-ink" : rank === 2 ? "bg-slate-300 text-ink" : rank === 3 ? "bg-orange-400 text-ink" : "bg-white/10 text-white";
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${style}`}>{rank}</span>;
}
function Avatar({ src, label }: { src: string | null; label: string }) {
  return src ? <img src={src} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-lime font-black text-ink">{label.charAt(0).toUpperCase()}</div>;
}
function Badge({ children }: { children?: string }) { return children ? <span className="mt-1 inline-flex rounded-full bg-cyan/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-cyan">{children}</span> : null; }

export default async function WallOfFamePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wall_of_fame_v3", { p_limit: 10 });
  const fame = (data ?? { testers: [], developers: [], projects: [], monthly_projects: [], monthly_testers: [], community_champions: [] }) as FameData;

  return (
    <section className="container-page py-14">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime text-ink"><Trophy size={30}/></div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[.25em] text-cyan">Wall of Fame</p>
        <h1 className="mt-2 text-4xl font-black">The people and projects building the Nexus</h1>
        <p className="mt-3 text-soft">Rankings use approved tests, ratings, useful feedback and real development activity. Paid boosts never affect these results.</p>
      </div>

      {error && <div className="mb-8 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Rankings could not be loaded: {error.message}</div>}

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <div className="mb-5 flex items-center gap-3"><Sparkles className="text-amber-300"/><div><h2 className="text-2xl font-black">Projects of the Month</h2><p className="text-sm text-soft">This month&apos;s testing and devlog activity</p></div></div>
          <div className="space-y-3">{fame.monthly_projects.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">No qualifying activity this month yet.</p> : fame.monthly_projects.map((project) => <Link href={`/projects/${project.slug}`} key={project.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 hover:bg-white/[0.08]"><RankBadge rank={Number(project.rank)}/><Avatar src={project.icon_url} label={project.name}/><div className="min-w-0 flex-1"><p className="truncate font-bold">{project.name}</p><p className="text-xs text-soft">{project.monthly_tests ?? 0} tests · {project.monthly_devlogs ?? 0} devlogs this month</p><Badge>{project.badge}</Badge></div></Link>)}</div>
        </section>

        <section className="card p-5">
          <div className="mb-5 flex items-center gap-3"><Medal className="text-lime"/><div><h2 className="text-2xl font-black">Testers of the Month</h2><p className="text-sm text-soft">Fresh monthly activity gives new users a fair chance</p></div></div>
          <div className="space-y-3">{fame.monthly_testers.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">No approved tests this month yet.</p> : fame.monthly_testers.map((person) => <Link href={`/profiles/${person.username}`} key={person.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 hover:bg-white/[0.08]"><RankBadge rank={Number(person.rank)}/><Avatar src={person.avatar_url} label={person.display_name || person.username}/><div className="min-w-0 flex-1"><p className="truncate font-bold">{person.display_name || person.username}</p><p className="text-xs text-soft">{person.monthly_tests ?? 0} approved tests this month</p><Badge>{person.badge}</Badge></div></Link>)}</div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5"><div className="mb-5 flex items-center gap-3"><Award className="text-lime"/><div><h2 className="text-2xl font-black">Top Testers</h2><p className="text-sm text-soft">Minimum 3 approved tests</p></div></div><div className="space-y-3">{fame.testers.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">Nobody has qualified yet.</p> : fame.testers.map((person) => <Link href={`/profiles/${person.username}`} key={person.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 hover:bg-white/[0.08]"><RankBadge rank={Number(person.rank)}/><Avatar src={person.avatar_url} label={person.display_name || person.username}/><div className="min-w-0 flex-1"><p className="truncate font-bold">{person.display_name || person.username}</p><p className="text-xs text-soft">{person.approved_tests ?? 0} tests · {person.helpful_feedback ?? 0} helpful</p><Badge>{person.badge}</Badge></div></Link>)}</div></section>

        <section className="card p-5"><div className="mb-5 flex items-center gap-3"><Crown className="text-cyan"/><div><h2 className="text-2xl font-black">Top Developers</h2><p className="text-sm text-soft">Minimum 3 approved tests received</p></div></div><div className="space-y-3">{fame.developers.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">Nobody has qualified yet.</p> : fame.developers.map((person) => <Link href={`/profiles/${person.username}`} key={person.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 hover:bg-white/[0.08]"><RankBadge rank={Number(person.rank)}/><Avatar src={person.avatar_url} label={person.display_name || person.username}/><div className="min-w-0 flex-1"><p className="truncate font-bold">{person.display_name || person.username}</p><p className="text-xs text-soft">{person.approved_tests_received ?? 0} tests · {Number(person.developer_reputation ?? 0).toFixed(1)} reputation</p><Badge>{person.badge}</Badge></div></Link>)}</div></section>

        <section className="card p-5"><div className="mb-5 flex items-center gap-3"><Star className="text-amber-300"/><div><h2 className="text-2xl font-black">Top Projects</h2><p className="text-sm text-soft">Minimum 3 approved tests and a rating</p></div></div><div className="space-y-3">{fame.projects.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">No project has qualified yet.</p> : fame.projects.map((project) => <Link href={`/projects/${project.slug}`} key={project.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 hover:bg-white/[0.08]"><RankBadge rank={Number(project.rank)}/><Avatar src={project.icon_url} label={project.name}/><div className="min-w-0 flex-1"><p className="truncate font-bold">{project.name}</p><p className="text-xs text-soft">{project.approved_tests ?? 0} tests · {project.average_rating ? `${Number(project.average_rating).toFixed(1)} rating` : "Not rated"}</p><Badge>{project.badge}</Badge></div></Link>)}</div></section>
      </div>

      <section className="card mt-8 p-5"><div className="mb-5 flex items-center gap-3"><Users className="text-cyan"/><div><h2 className="text-2xl font-black">Community Champions</h2><p className="text-sm text-soft">Users who both test projects and publish their own work</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{fame.community_champions.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft md:col-span-2 xl:col-span-3">No community champion has qualified yet.</p> : fame.community_champions.map((person) => <Link href={`/profiles/${person.username}`} key={person.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 hover:bg-white/[0.08]"><RankBadge rank={Number(person.rank)}/><Avatar src={person.avatar_url} label={person.display_name || person.username}/><div className="min-w-0 flex-1"><p className="truncate font-bold">{person.display_name || person.username}</p><p className="text-xs text-soft">Score {person.community_score ?? 0} · {person.approved_tests ?? 0} tests</p><Badge>{person.badge}</Badge></div></Link>)}</div></section>

      <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="card p-5 text-center"><Users className="mx-auto text-lime"/><p className="mt-3 font-black">Test honestly</p><p className="mt-1 text-sm text-soft">Only approved work counts.</p></div><div className="card p-5 text-center"><FolderKanban className="mx-auto text-cyan"/><p className="mt-3 font-black">Build consistently</p><p className="mt-1 text-sm text-soft">Meaningful devlogs refresh project activity.</p></div><div className="card p-5 text-center"><Trophy className="mx-auto text-amber-300"/><p className="mt-3 font-black">Earn recognition</p><p className="mt-1 text-sm text-soft">Monthly and all-time rankings are separate.</p></div></div>
    </section>
  );
}
