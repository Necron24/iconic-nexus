import Link from "next/link";
import { Award, Crown, FolderKanban, Star, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Person = { rank: number; id: string; username: string; display_name: string | null; avatar_url: string | null; tester_reputation?: number; approved_tests?: number; published_projects?: number; approved_tests_received?: number };
type Project = { rank: number; id: string; slug: string; name: string; icon_url: string | null; platform: string; approved_tests: number; average_rating: number | null };
type FameData = { testers: Person[]; developers: Person[]; projects: Project[] };

function RankBadge({ rank }: { rank: number }) {
  const style = rank === 1 ? "bg-amber-300 text-ink" : rank === 2 ? "bg-slate-300 text-ink" : rank === 3 ? "bg-orange-400 text-ink" : "bg-white/10 text-white";
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${style}`}>{rank}</span>;
}

function Avatar({ src, label }: { src: string | null; label: string }) {
  return src ? <img src={src} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="grid h-12 w-12 rounded-xl bg-lime place-items-center font-black text-ink">{label.charAt(0).toUpperCase()}</div>;
}

export default async function WallOfFamePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wall_of_fame", { p_limit: 10 });
  const fame = (data ?? { testers: [], developers: [], projects: [] }) as FameData;

  return (
    <section className="container-page py-14">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime text-ink"><Trophy size={30} /></div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[.25em] text-cyan">Wall of Fame</p>
        <h1 className="mt-2 text-4xl font-black">The people and projects building the Nexus</h1>
        <p className="mt-3 text-soft">Rankings reward approved testing, useful participation and successful projects—not empty activity.</p>
      </div>

      {error && <div className="mb-8 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Rankings could not be loaded: {error.message}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card p-5">
          <div className="mb-5 flex items-center gap-3"><Award className="text-lime" /><div><h2 className="text-2xl font-black">Top Testers</h2><p className="text-sm text-soft">Most approved testing work</p></div></div>
          <div className="space-y-3">
            {fame.testers.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">No approved tests yet.</p> : fame.testers.map((person) => <Link href={`/profiles/${person.username}`} key={person.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"><RankBadge rank={Number(person.rank)} /><Avatar src={person.avatar_url} label={person.display_name || person.username} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{person.display_name || person.username}</p><p className="text-xs text-soft">{person.approved_tests ?? 0} approved tests · {Number(person.tester_reputation ?? 0).toFixed(1)} reputation</p></div></Link>)}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-5 flex items-center gap-3"><Crown className="text-cyan" /><div><h2 className="text-2xl font-black">Top Developers</h2><p className="text-sm text-soft">Projects with real tester activity</p></div></div>
          <div className="space-y-3">
            {fame.developers.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">No developer rankings yet.</p> : fame.developers.map((person) => <Link href={`/profiles/${person.username}`} key={person.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"><RankBadge rank={Number(person.rank)} /><Avatar src={person.avatar_url} label={person.display_name || person.username} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{person.display_name || person.username}</p><p className="text-xs text-soft">{person.published_projects ?? 0} projects · {person.approved_tests_received ?? 0} approved tests</p></div></Link>)}
          </div>
        </section>

        <section className="card p-5">
          <div className="mb-5 flex items-center gap-3"><Star className="text-amber-300" /><div><h2 className="text-2xl font-black">Top Projects</h2><p className="text-sm text-soft">Most tested and best rated</p></div></div>
          <div className="space-y-3">
            {fame.projects.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">No project rankings yet.</p> : fame.projects.map((project) => <Link href={`/projects/${project.slug}`} key={project.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"><RankBadge rank={Number(project.rank)} /><Avatar src={project.icon_url} label={project.name} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{project.name}</p><p className="text-xs text-soft">{project.approved_tests} approved tests · {project.average_rating ? `${Number(project.average_rating).toFixed(1)} rating` : "Not rated"}</p></div></Link>)}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5 text-center"><Users className="mx-auto text-lime" /><p className="mt-3 font-black">Test honestly</p><p className="mt-1 text-sm text-soft">Only approved tests improve rankings.</p></div>
        <div className="card p-5 text-center"><FolderKanban className="mx-auto text-cyan" /><p className="mt-3 font-black">Build consistently</p><p className="mt-1 text-sm text-soft">Published projects and tester activity count.</p></div>
        <div className="card p-5 text-center"><Trophy className="mx-auto text-amber-300" /><p className="mt-3 font-black">Earn recognition</p><p className="mt-1 text-sm text-soft">Future monthly awards and badges will appear here.</p></div>
      </div>
    </section>
  );
}
