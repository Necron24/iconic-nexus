import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileText, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ScreenshotGallery } from "@/components/screenshot-gallery";
import { ShareButton } from "@/components/share-button";
import { DevlogCard } from "@/components/updates/devlog-card";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { TrackedLink } from "@/components/tracked-link";
import { FollowButton } from "@/components/follow-button";
import { toggleProjectFollow } from "@/app/following/actions";
import { PlatformBadges, ProjectTypeBadge, StageBadge } from "@/components/project-meta";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, name, slug, type, stage, platform, genre, short_description, description, icon_url, cover_url, testing_url, known_issues, is_published, project_images(image_url, sort_order)")
    .eq("slug", projectId)
    .is("archived_at", null)
    .maybeSingle();

  if (!project || (!project.is_published && project.owner_id !== user?.id)) notFound();

  const screenshots = [...(project.project_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const [{ data: updates }, { count: followerCount }, followResult] = await Promise.all([
    supabase
      .from("project_updates")
      .select("id,title,body,version_label,update_type,image_url,release_url,created_at,published_at,accent_color,background_color,background_style,background_image_url,heading_font,body_font,card_style,layout_style,text_align,image_fit")
      .eq("project_id", project.id)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("project_follows").select("project_id", { count: "exact", head: true }).eq("project_id", project.id),
    user && user.id !== project.owner_id
      ? supabase.from("project_follows").select("project_id").eq("project_id", project.id).eq("profile_id", user.id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  return (
    <section className="container-page relative py-14">
      <AnalyticsTracker eventType="view" targetType="project" targetId={project.id} />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="grid h-56 place-items-center overflow-hidden bg-white/5 md:h-80">
          {project.cover_url ? <img src={project.cover_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="text-white/20" size={54} />}
        </div>

        <div className="p-6 md:p-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              {project.icon_url ? <img src={project.icon_url} alt={`${project.name} icon`} className="h-20 w-20 rounded-2xl object-cover" /> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-lime text-3xl font-black text-ink">{project.name.charAt(0).toUpperCase()}</div>}
              <div>
                <div className="mb-3 flex flex-wrap gap-2"><ProjectTypeBadge type={project.type}/><PlatformBadges platform={project.platform}/><StageBadge stage={project.stage}/>{project.genre && <span className="badge !px-3 !py-1.5">{project.genre}</span>}</div>
                <h1 className="text-4xl font-black md:text-5xl">{project.name}</h1>
                <p className="mt-3 max-w-2xl text-lg text-soft">{project.short_description}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {user?.id !== project.owner_id && (
                <FollowButton
                  action={toggleProjectFollow.bind(null, project.id, `/projects/${project.slug}`)}
                  following={Boolean(followResult.data)}
                  kind="project"
                  count={followerCount ?? 0}
                />
              )}
              <ShareButton title={project.name} text={project.short_description} path={`/projects/${project.slug}`} analyticsTargetType="project" analyticsTargetId={project.id} />
              {project.testing_url && <TrackedLink href={project.testing_url} target="_blank" rel="noreferrer" className="btn-primary gap-2" targetType="project" targetId={project.id}>Open test link <ExternalLink size={17} /></TrackedLink>}
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="card p-6"><h2 className="text-2xl font-black">About this project</h2><p className="mt-4 whitespace-pre-wrap leading-8 text-soft">{project.description || project.short_description}</p></div>

              {screenshots.length > 0 && <div className="card p-6"><h2 className="text-2xl font-black">Screenshots</h2><p className="mt-2 text-sm text-soft">Click or tap a thumbnail to view the full-size screenshot.</p><div className="mt-5"><ScreenshotGallery images={screenshots} projectName={project.name} /></div></div>}

              <div id="devlogs" className="card scroll-mt-28 p-6">
                <div className="flex items-center gap-3"><FileText className="text-cyan"/><div><h2 className="text-2xl font-black">Updates &amp; devlogs</h2><p className="text-sm text-soft">Releases, progress reports and testing announcements.</p></div></div>
                {!updates?.length ? <p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-center text-soft">No public updates have been posted yet.</p> : <div className="mt-5 space-y-6">{updates.map((update) => <DevlogCard key={update.id} update={update} />)}</div>}
              </div>
            </div>

            <aside className="card h-fit p-6"><h2 className="text-xl font-black">Testing information</h2><div className="mt-5"><p className="text-sm font-bold text-white">Known issues</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-soft">{project.known_issues || "No known issues have been listed."}</p></div>{!project.testing_url && <p className="mt-5 rounded-xl bg-white/5 p-4 text-sm text-soft">The creator has not added a testing link yet.</p>}</aside>
          </div>
        </div>
      </div>
    </section>
  );
}
