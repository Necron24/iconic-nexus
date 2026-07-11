import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bug, Coins, Gamepad2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: campaigns }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, slug, name, type, platform, stage, short_description, icon_url, cover_url")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("testing_campaigns")
      .select("id, title, tester_goal, reward_credits, duration_days, campaign_members(count), projects!inner(platform, is_published)")
      .eq("status", "active")
      .eq("projects.is_published", true)
      .limit(1)
  ]);

  const featuredCampaign = campaigns?.[0];
  const joinedCount = Array.isArray(featuredCampaign?.campaign_members)
    ? Number(featuredCampaign.campaign_members[0]?.count ?? 0)
    : 0;
  const goal = Number(featuredCampaign?.tester_goal ?? 0);
  const campaignProgress = goal > 0 ? Math.min(100, Math.round((joinedCount / goal) * 100)) : 0;
  const campaignProject = Array.isArray(featuredCampaign?.projects)
    ? featuredCampaign.projects[0]
    : featuredCampaign?.projects;

  return (
    <>
      <section className="container-page grid gap-10 py-12 md:grid-cols-[1.08fr_.92fr] md:items-center md:py-16">
        <div>
          <span className="badge mb-5 border-lime/30 text-lime">Built for indie creators</span>
          <div className="mb-6 inline-flex max-w-full overflow-hidden rounded-3xl border border-white/10 bg-[#071127] p-3 shadow-[0_0_40px_rgba(87,230,255,.08)]">
            <Image src="/brand/iconic-nexus-logo.png" alt="Iconic Nexus logo" width={2172} height={724} priority className="h-auto w-[340px] max-w-full md:w-[420px]" />
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-tight md:text-7xl">
            Where developers and testers <span className="bg-gradient-to-r from-lime to-cyan bg-clip-text text-transparent">connect.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-soft">
            Discover indie apps and games, give useful feedback, earn Nexus Credits and use those credits to get your own project tested.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/discover" className="btn-primary gap-2">
              Find projects <ArrowRight size={18} />
            </Link>
            <Link href="/register" className="btn-secondary">
              Get testers
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-soft">
            <span className="badge gap-2"><Sparkles size={14} className="text-lime" /> Real feedback</span>
            <span className="badge gap-2"><Coins size={14} className="text-cyan" /> Credit-based exchange</span>
            <span className="badge gap-2"><Users size={14} className="text-cyan" /> Indie-friendly community</span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-6 shadow-glow">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-lime/10 blur-3xl" />
          <div className="absolute left-6 top-6 h-28 w-28 rounded-full bg-cyan/10 blur-3xl" />
          <div className="mb-6 rounded-3xl border border-white/10 bg-[#071127] p-4">
            <Image src="/brand/iconic-nexus-icon.png" alt="Iconic Nexus emblem" width={660} height={660} className="mx-auto h-28 w-28 rounded-3xl object-cover md:h-36 md:w-36" />
          </div>
          {featuredCampaign ? (
            <>
              <p className="text-sm font-bold text-cyan">LIVE CAMPAIGN</p>
              <h2 className="mt-2 text-3xl font-black">{featuredCampaign.title}</h2>
              <p className="mt-3 text-soft">
                {campaignProject?.platform ?? "Multiple platforms"} · {featuredCampaign.duration_days} day test · {featuredCampaign.reward_credits} credits
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-2xl font-black">{joinedCount}</p>
                  <p className="text-xs text-soft">Joined</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-2xl font-black">{goal}</p>
                  <p className="text-xs text-soft">Needed</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-2xl font-black">{featuredCampaign.duration_days}d</p>
                  <p className="text-xs text-soft">Duration</p>
                </div>
              </div>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-lime" style={{ width: `${campaignProgress}%` }} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-cyan">ICONIC NEXUS</p>
              <h2 className="mt-2 text-3xl font-black">Your next testers are waiting</h2>
              <p className="mt-3 leading-7 text-soft">Create a project, publish it and start building a real testing community.</p>
              <Link href="/register" className="btn-primary mt-8">Join the Nexus</Link>
            </>
          )}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] py-16">
        <div className="container-page">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">How it works</p>
            <h2 className="mt-3 text-3xl font-black md:text-4xl">A fair testing exchange</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              [Gamepad2, "Test projects", "Join campaigns and test real indie games and apps."],
              [Bug, "Give useful feedback", "Submit structured reports, screenshots and bug details."],
              [Coins, "Earn and spend credits", "Use earned credits to get testers for your own project."]
            ].map(([Icon, title, body], index) => {
              const C = Icon as typeof Gamepad2;
              return (
                <div className="card p-6" key={String(title)}>
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-lime text-ink">
                    <C size={22} />
                  </div>
                  <p className="mb-2 text-sm font-bold text-cyan">STEP {index + 1}</p>
                  <h3 className="text-xl font-black">{String(title)}</h3>
                  <p className="mt-3 leading-7 text-soft">{String(body)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Discover</p>
            <h2 className="mt-2 text-3xl font-black">Projects needing testers</h2>
          </div>
          <Link href="/discover" className="hidden text-sm font-bold text-lime sm:block">
            View all projects →
          </Link>
        </div>

        {projects?.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-soft">No published projects yet. Be the first creator to add one.</div>
        )}
      </section>

      <section className="container-page grid gap-5 pb-8 md:grid-cols-2">
        <div className="card p-7">
          <ShieldCheck className="text-lime" />
          <h3 className="mt-4 text-2xl font-black">Honest feedback only</h3>
          <p className="mt-3 leading-7 text-soft">
            No forced five-star reviews, no empty comments and no fake testing. Reputation is earned through useful reports.
          </p>
        </div>
        <div className="card p-7">
          <Users className="text-cyan" />
          <h3 className="mt-4 text-2xl font-black">Built for small developers</h3>
          <p className="mt-3 leading-7 text-soft">
            Run closed tests, find beta users and build a community around your project without needing a large marketing budget.
          </p>
        </div>
      </section>
    </>
  );
}
