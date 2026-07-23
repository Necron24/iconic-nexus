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
  blue: '#60A5FA',
  emerald: '#34D399',
  orange: '#FB923C',
  red: '#F87171',
  pink: '#F472B6',
  indigo: '#818CF8',
  teal: '#2DD4BF'
};

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,banner_url,bio,headline,country,role,tester_reputation,developer_reputation,accent_color,website_url,github_url,social_url,created_at,profile_theme,profile_card_style,banner_overlay,avatar_shape,profile_button_style,profile_layout,show_website,show_github,show_social,show_projects,show_reputation,show_badges,show_testing_stats')
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

  const buttonStyle = p.profile_button_style || 'solid';
  const accentButton = buttonStyle === 'outline'
    ? { border: `1px solid ${accent}99`, color: accent, backgroundColor: 'transparent' }
    : buttonStyle === 'glass'
      ? { border: `1px solid ${accent}66`, color: 'white', backgroundColor: `${accent}18`, backdropFilter: 'blur(12px)' }
      : { backgroundColor: accent, boxShadow: `0 0 24px ${accent}33` } as CSSProperties;
  const avatarClass = p.avatar_shape === 'circle' ? 'rounded-full' : p.avatar_shape === 'hexagon' ? '[clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)]' : 'rounded-3xl';
  const shellClass = p.profile_theme === 'glass' ? 'bg-white/[0.07] backdrop-blur-xl' : p.profile_theme === 'dark_pro' ? 'bg-black/50' : p.profile_theme === 'minimal' ? 'bg-[#0c1323]' : 'bg-white/[0.04]';

  return (
    <section className="container-page py-14" style={style}>
      <div
        className={`mx-auto max-w-5xl overflow-hidden border transition-all ${shellClass} ${p.profile_card_style === 'compact' ? 'rounded-2xl' : 'rounded-3xl'}`}
        style={{ borderColor: p.profile_card_style === 'borderless' ? 'transparent' : `${accent}66`, boxShadow: p.profile_theme === 'neon' ? `0 0 60px ${accent}35` : `0 0 0 1px ${accent}22, 0 0 50px ${accent}16` }}
      >
        <div className="relative h-52 bg-gradient-to-r from-white/5 to-white/10 md:h-72">
          {p.banner_url ? (
            <img src={p.banner_url} alt={`${p.display_name || p.username} banner`} className={`h-full w-full object-cover ${p.banner_overlay === 'blur' ? 'scale-105 blur-sm' : ''}`} />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `radial-gradient(circle at 25% 30%, ${accent}55, transparent 35%), radial-gradient(circle at 78% 20%, ${accent}22, transparent 28%), linear-gradient(135deg, #11192b, #0b1020)` }}
            />
          )}
          {p.banner_overlay !== 'none' && <div className={`absolute inset-0 ${p.banner_overlay === 'dark' ? 'bg-black/55' : p.banner_overlay === 'blur' ? 'bg-black/25 backdrop-blur-[2px]' : 'bg-gradient-to-t from-[#0d1424] via-transparent to-transparent'}`} />}
          <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        </div>

        <div className="relative px-6 pb-8 md:px-9">
          <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt={`${p.display_name || p.username} avatar`} className={`h-32 w-32 border-4 object-cover shadow-xl ${avatarClass}`} style={{ borderColor: accent }} />
              ) : (
                <div className={`grid h-32 w-32 place-items-center border-4 text-4xl font-black text-[#0b1020] shadow-xl ${avatarClass}`} style={{ backgroundColor: accent, borderColor: accent }}>
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
              {p.show_website !== false && p.website_url && (
                <a href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-ink transition hover:scale-[1.02]" style={accentButton}>
                  <Globe2 size={16} /> Website
                </a>
              )}
              {p.show_github !== false && p.github_url && (
                <a href={p.github_url} target="_blank" rel="noreferrer" className="btn-secondary gap-2" style={{ borderColor: `${accent}66` }}>
                  <Github size={16} /> GitHub
                </a>
              )}
              {p.show_social !== false && p.social_url && (
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

          {(p.show_testing_stats !== false || p.show_reputation !== false) && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ...(p.show_testing_stats !== false ? [['Published projects', projects?.length || 0], ['Approved tests', tests || 0]] : []),
                ...(p.show_reputation !== false ? [['Tester reputation', `${Number(p.tester_reputation || 0).toFixed(1)}/5`], ['Developer reputation', `${Number(p.developer_reputation || 0).toFixed(1)}/5`]] : [])
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border bg-white/5 p-5" style={{ borderColor: `${accent}44` }}>
                  <p className="text-sm text-soft">{label}</p>
                  <p className="mt-2 text-3xl font-black" style={{ color: accent }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {p.show_badges !== false && <div className="mt-4 flex flex-wrap gap-2">
            {Number(p.tester_reputation || 0) >= 4.5 && <span className="badge border-lime/30 bg-lime/10 text-lime">Trusted Tester</span>}
            {Number(p.developer_reputation || 0) >= 4.5 && <span className="badge border-cyan/30 bg-cyan/10 text-cyan">Trusted Developer</span>}
          </div>}
        </div>
      </div>

      {p.show_projects !== false && <div className="mx-auto mt-10 max-w-5xl">
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
      </div>}

      <div className="mx-auto mt-8 max-w-5xl text-center">
        <Link href="/report" className="text-sm text-soft hover:text-white">Report this profile</Link>
      </div>
    </section>
  );
}
