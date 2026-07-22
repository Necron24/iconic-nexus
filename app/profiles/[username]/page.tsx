import type { CSSProperties } from "react";
import Link from "next/link";
import { ExternalLink, Github, Globe2, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";

const accentMap: Record<string, string> = {
  lime: '#9EFF3A',
  cyan: '#57E6FF',
  violet: '#A78BFA',
  amber: '#FBBF24',
  rose: '#FB7185',
  blue: '#60A5FA'
};

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,banner_url,bio,headline,country,role,tester_reputation,developer_reputation,accent_color,website_url,github_url,social_url,created_at')
    .eq('username', username)
    .maybeSingle();

  if (!p) notFound();

  const [{ data: projects }, { count: tests }] = await Promise.all([
    supabase
      .from('projects')
      .select('id,slug,name,type,platform,stage,short_description,icon_url,cover_url')
      .eq('owner_id', p.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('campaign_members')
      .select('id', { count: 'exact', head: true })
      .eq('tester_id', p.id)
      .eq('status', 'approved')
  ]);

  const accent = accentMap[p.accent_color || 'lime'] || accentMap.lime;
  const style = { '--profile-accent': accent } as CSSProperties;

  const accentButton = {
    backgroundColor: accent,
    boxShadow: `0 0 24px ${accent}33`
  } as CSSProperties;

  return (
    <section className="container-page py-14" style={style}>
      <div
        className="mx-auto max-w-5xl overflow-hidden rounded-3xl border bg-white/[0.04] transition-all"
        style={{ borderColor: `${accent}66`, boxShadow: `0 0 0 1px ${accent}22, 0 0 50px ${accent}16` }}
      >
        <div className="relative h-52 bg-gradient-to-r from-white/5 to-white/10 md:h-72">
          {p.banner_url ? (
            <img src={p.banner_url} alt={`${p.display_name || p.username} banner`} className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `radial-gradient(circle at 25% 30%, ${accent}55, transparent 35%), radial-gradient(circle at 78% 20%, ${accent}22, transparent 28%), linear-gradient(135deg, #11192b, #0b1020)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1424] via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        </div>

        <div className="relative px-6 pb-8 md:px-9">
          <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={`${p.display_name || p.username} avatar`} className="h-32 w-32 rounded-3xl border-4 object-cover shadow-xl" style={{ borderColor: accent }} />
              ) : (
                <div className="grid h-32 w-32 place-items-center rounded-3xl border-4 text-4xl font-black text-[#0b1020] shadow-xl" style={{ backgroundColor: accent, borderColor: accent }}>
                  {(p.display_name || p.username)[0]}
                </div>
              )}
              <div className="pb-2">
                <p className="text-sm font-bold uppercase tracking-[.2em]" style={{ color: accent }}>{p.role}</p>
                <h1 className="mt-1 text-4xl font-black md:text-5xl">{p.display_name || p.username}</h1>
                <p className="mt-2 text-soft">@{p.username}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-2">
              {p.website_url && (
                <a href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-ink transition hover:scale-[1.02]" style={accentButton}>
                  <Globe2 size={16} /> Website
                </a>
              )}
              {p.github_url && (
                <a href={p.github_url} target="_blank" rel="noreferrer" className="btn-secondary gap-2" style={{ borderColor: `${accent}66` }}>
                  <Github size={16} /> GitHub
                </a>
              )}
              {p.social_url && (
                <a href={p.social_url} target="_blank" rel="noreferrer" className="btn-secondary gap-2" style={{ borderColor: `${accent}66` }}>
                  Social <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>

          {p.headline && <p className="mt-6 text-xl font-semibold" style={{ color: accent }}>{p.headline}</p>}

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-soft">
            {p.country && <span className="flex items-center gap-2"><MapPin size={16} style={{ color: accent }} />{p.country}</span>}
            <span>Member since {new Date(p.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })}</span>
          </div>

          {p.bio && <p className="mt-7 max-w-3xl whitespace-pre-wrap text-lg leading-8 text-soft">{p.bio}</p>}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Published projects', projects?.length || 0],
              ['Approved tests', tests || 0],
              ['Tester reputation', `${Number(p.tester_reputation || 0).toFixed(1)}/5`],
              ['Developer reputation', `${Number(p.developer_reputation || 0).toFixed(1)}/5`]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border bg-white/5 p-5" style={{ borderColor: `${accent}44` }}>
                <p className="text-sm text-soft">{label}</p>
                <p className="mt-2 text-3xl font-black" style={{ color: accent }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Number(p.tester_reputation || 0) >= 4.5 && <span className="badge border-lime/30 bg-lime/10 text-lime">Trusted Tester</span>}
            {Number(p.developer_reputation || 0) >= 4.5 && <span className="badge border-cyan/30 bg-cyan/10 text-cyan">Trusted Developer</span>}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-5xl">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em]" style={{ color: accent }}>Creator portfolio</p>
            <h2 className="mt-2 text-3xl font-black">Published projects</h2>
          </div>
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => <ProjectCard key={project.id} project={project} />)}
          </div>
        ) : (
          <div className="card p-8 text-center text-soft" style={{ borderColor: `${accent}44` }}>
            This profile has not published any projects yet.
          </div>
        )}
      </div>

      <div className="mx-auto mt-8 max-w-5xl text-center">
        <Link href="/report" className="text-sm text-soft hover:text-white">Report this profile</Link>
      </div>
    </section>
  );
}
