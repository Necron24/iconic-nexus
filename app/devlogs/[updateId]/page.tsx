import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellPlus, Bookmark, BookmarkCheck, Flag, MessageCircle, Rocket, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DevlogCard } from "@/components/updates/devlog-card";
import { ShareButton } from "@/components/share-button";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import {
  addDevlogComment,
  removeDevlogComment,
  toggleDevlogBookmark,
  toggleDevlogReaction,
  toggleProjectFollow
} from "./actions";

type ProjectInfo = {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
  platform: string;
  stage: string;
  owner_id: string;
  short_description: string;
};

type CommentRow = {
  id: string;
  update_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
};

type ProfileInfo = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
};

const reactionOptions = [
  ["fire", "🔥", "Fire"],
  ["love", "❤️", "Love"],
  ["clap", "👏", "Applause"],
  ["helpful", "💡", "Helpful"]
] as const;

export async function generateMetadata({ params }: { params: Promise<{ updateId: string }> }): Promise<Metadata> {
  const { updateId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("project_updates").select("title,body").eq("id", updateId).eq("is_published", true).maybeSingle();
  if (!data) return { title: "Devlog | Iconic Nexus" };
  return {
    title: `${data.title} | Iconic Nexus Devlogs`,
    description: data.body.slice(0, 155)
  };
}

function Avatar({ profile, size = "md" }: { profile?: ProfileInfo; size?: "sm" | "md" }) {
  const label = profile?.display_name || profile?.username || "User";
  const dimensions = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  if (profile?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.avatar_url} alt="" className={`${dimensions} shrink-0 rounded-full object-cover`} />;
  }
  return <span className={`${dimensions} grid shrink-0 place-items-center rounded-full bg-cyan/15 font-black text-cyan`}>{label.charAt(0).toUpperCase()}</span>;
}

export default async function DevlogDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ updateId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { updateId } = await params;
  const { error: queryError } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: update } = await supabase
    .from("project_updates")
    .select("id,project_id,author_id,title,body,version_label,update_type,image_url,release_url,is_published,created_at,published_at,accent_color,background_color,background_style,background_image_url,heading_font,body_font,card_style,layout_style,text_align,image_fit,projects!inner(id,slug,name,icon_url,platform,stage,owner_id,short_description)")
    .eq("id", updateId)
    .is("archived_at", null)
    .is("projects.archived_at", null)
    .maybeSingle();

  if (!update || (!update.is_published && update.author_id !== user?.id)) notFound();
  const project = (Array.isArray(update.projects) ? update.projects[0] : update.projects) as ProjectInfo;

  const [
    reactionsResult,
    commentsResult,
    followersResult,
    creatorResult,
    campaignResult,
    viewerProfileResult,
    bookmarkResult,
    followingResult
  ] = await Promise.all([
    supabase.from("devlog_reactions").select("profile_id,reaction").eq("update_id", updateId),
    supabase.from("devlog_comments").select("id,update_id,author_id,parent_id,body,is_deleted,created_at").eq("update_id", updateId).order("created_at", { ascending: true }),
    supabase.from("project_follows").select("project_id", { count: "exact", head: true }).eq("project_id", project.id),
    supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id", project.owner_id).maybeSingle(),
    supabase.from("testing_campaigns").select("id,title,reward_credits,minimum_minutes").eq("project_id", project.id).eq("status", "active").eq("is_private", false).limit(1).maybeSingle(),
    user ? supabase.from("profiles").select("id,username,display_name,avatar_url,is_admin").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("devlog_bookmarks").select("update_id").eq("update_id", updateId).eq("profile_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("project_follows").select("project_id").eq("project_id", project.id).eq("profile_id", user.id).maybeSingle() : Promise.resolve({ data: null })
  ]);

  const comments = (commentsResult.data ?? []) as CommentRow[];
  const authorIds = [...new Set(comments.map((comment) => comment.author_id))];
  const { data: commentProfiles } = authorIds.length
    ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds)
    : { data: [] };
  const profiles = new Map((commentProfiles ?? []).map((profile) => [profile.id, profile as ProfileInfo]));
  const reactions = reactionsResult.data ?? [];
  const currentReaction = reactions.find((reaction) => reaction.profile_id === user?.id)?.reaction ?? null;
  const reactionCounts = new Map<string, number>();
  for (const reaction of reactions) reactionCounts.set(reaction.reaction, (reactionCounts.get(reaction.reaction) ?? 0) + 1);
  const roots = comments.filter((comment) => !comment.parent_id);
  const replies = new Map<string, CommentRow[]>();
  for (const comment of comments.filter((row) => row.parent_id)) {
    replies.set(comment.parent_id!, [...(replies.get(comment.parent_id!) ?? []), comment]);
  }
  const creator = creatorResult.data as ProfileInfo | null;
  const viewerProfile = viewerProfileResult.data as ProfileInfo | null;
  const bookmarked = Boolean(bookmarkResult.data);
  const following = Boolean(followingResult.data);
  const canModerate = user?.id === project.owner_id || Boolean(viewerProfile?.is_admin);

  return (
    <section className="container-page relative py-10">
      <AnalyticsTracker eventType="view" targetType="devlog" targetId={updateId} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/devlogs" className="text-sm font-bold text-cyan hover:text-white">← Back to all devlogs</Link>
        {!update.is_published && <span className="badge border-amber-300/30 bg-amber-300/10 text-amber-100">Private draft preview</span>}
      </div>

      {queryError && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{queryError}</div>}

      <div className="card mb-5 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {project.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.icon_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lime text-xl font-black text-ink">{project.name.charAt(0)}</span>
          )}
          <div className="min-w-0">
            <Link href={`/projects/${project.slug}`} className="text-lg font-black hover:text-cyan">{project.name}</Link>
            <p className="truncate text-sm text-soft">{project.short_description}</p>
            {creator && <Link href={creator.username ? `/profiles/${creator.username}` : "#"} className="mt-1 inline-flex items-center gap-1 text-xs text-soft hover:text-white"><UserRound size={13} /> {creator.display_name || `@${creator.username}`}</Link>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">{followersResult.count ?? 0} followers</span>
          {user?.id === project.owner_id ? (
            <span className="badge">Your project</span>
          ) : (
            <form action={toggleProjectFollow.bind(null, updateId, project.id)}>
              <button className={following ? "btn-secondary !px-4 !py-2 gap-2" : "btn-primary !px-4 !py-2 gap-2"}><BellPlus size={16} /> {following ? "Following" : "Follow project"}</button>
            </form>
          )}
        </div>
      </div>

      <DevlogCard update={update} showDetailLink={false} />

      <section id="community" className="card mt-6 p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Join the conversation</h2>
            <p className="mt-1 text-sm text-soft">{reactions.length} reactions · {comments.filter((comment) => !comment.is_deleted).length} comments</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {reactionOptions.map(([value, emoji, label]) => (
              <form key={value} action={toggleDevlogReaction.bind(null, updateId)}>
                <button
                  name="reaction"
                  value={value}
                  title={label}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${currentReaction === value ? "border-cyan/60 bg-cyan/15 text-cyan" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                >
                  <span className="text-base">{emoji}</span> {reactionCounts.get(value) ?? 0}
                </button>
              </form>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-5">
          <form action={toggleDevlogBookmark.bind(null, updateId)}>
            <button className="btn-secondary !px-4 !py-2 gap-2">{bookmarked ? <BookmarkCheck size={16} className="text-lime" /> : <Bookmark size={16} />} {bookmarked ? "Saved" : "Save"}</button>
          </form>
          <ShareButton title={update.title} text={`Read ${update.title} on Iconic Nexus.`} path={`/devlogs/${updateId}`} className="btn-secondary !px-4 !py-2 gap-2" analyticsTargetType="devlog" analyticsTargetId={updateId} />
          <Link href={`/report?targetType=devlog&targetId=${updateId}`} className="btn-secondary !px-4 !py-2 gap-2 text-red-200"><Flag size={15} /> Report</Link>
        </div>
      </section>

      {update.update_type === "testing_needed" && campaignResult.data && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-lime/25 bg-lime/[0.07] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="flex items-center gap-2 font-black text-lime"><Rocket size={18} /> Testers needed now</p><h2 className="mt-2 text-2xl font-black">{campaignResult.data.title}</h2><p className="mt-2 text-sm text-soft">Minimum {campaignResult.data.minimum_minutes} minutes · Earn {campaignResult.data.reward_credits} credits after approved feedback.</p></div>
            <Link href={`/campaigns/${campaignResult.data.id}`} className="btn-primary">Join testing campaign</Link>
          </div>
        </section>
      )}

      <section id="comments" className="mt-8 scroll-mt-28">
        <div className="mb-5 flex items-center gap-3"><MessageCircle className="text-cyan" /><div><h2 className="text-2xl font-black">Comments</h2><p className="text-sm text-soft">Ask questions, share feedback and encourage the creator.</p></div></div>

        {user ? (
          <form action={addDevlogComment.bind(null, updateId)} className="card mb-6 p-5">
            <label><span className="label">Add a comment</span><textarea name="body" minLength={2} maxLength={2000} required className="field min-h-28 resize-y" placeholder="Keep it constructive and useful." /></label>
            <div className="mt-3 flex justify-end"><button className="btn-primary">Post comment</button></div>
          </form>
        ) : (
          <div className="card mb-6 p-5 text-center text-soft"><Link href={`/login?next=${encodeURIComponent(`/devlogs/${updateId}`)}`} className="font-bold text-cyan hover:text-white">Log in</Link> to react, save, follow and comment.</div>
        )}

        {roots.length === 0 ? (
          <div className="card p-8 text-center text-soft">No comments yet. Start the conversation.</div>
        ) : (
          <div className="space-y-4">
            {roots.map((comment) => {
              const profile = profiles.get(comment.author_id);
              const canRemove = user?.id === comment.author_id || canModerate;
              return (
                <article key={comment.id} className="card p-5">
                  <div className="flex gap-3">
                    <Avatar profile={profile} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div><strong>{profile?.display_name || profile?.username || "Iconic Nexus user"}</strong><p className="text-xs text-soft">{new Date(comment.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p></div>
                        <div className="flex gap-2">
                          {!comment.is_deleted && <Link href={`/report?targetType=comment&targetId=${comment.id}`} className="text-xs text-soft hover:text-red-200">Report</Link>}
                          {canRemove && !comment.is_deleted && <form action={removeDevlogComment.bind(null, updateId, comment.id)}><button className="text-xs text-red-200 hover:text-red-100">Remove</button></form>}
                        </div>
                      </div>
                      <p className={`mt-3 whitespace-pre-wrap leading-7 ${comment.is_deleted ? "italic text-soft" : "text-white/80"}`}>{comment.is_deleted ? "This comment was removed." : comment.body}</p>

                      {user && !comment.is_deleted && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-bold text-cyan">Reply</summary>
                          <form action={addDevlogComment.bind(null, updateId)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input type="hidden" name="parentId" value={comment.id} />
                            <input name="body" minLength={2} maxLength={2000} required className="field" placeholder="Write a reply" />
                            <button className="btn-secondary whitespace-nowrap">Post reply</button>
                          </form>
                        </details>
                      )}

                      {(replies.get(comment.id) ?? []).length > 0 && (
                        <div className="mt-4 space-y-3 border-l border-white/10 pl-4">
                          {(replies.get(comment.id) ?? []).map((reply) => {
                            const replyProfile = profiles.get(reply.author_id);
                            const canRemoveReply = user?.id === reply.author_id || canModerate;
                            return (
                              <div key={reply.id} className="rounded-xl bg-white/[0.035] p-4">
                                <div className="flex gap-2">
                                  <Avatar profile={replyProfile} size="sm" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{replyProfile?.display_name || replyProfile?.username || "User"}</strong><span className="text-xs text-soft">{new Date(reply.created_at).toLocaleDateString("en-ZA")}</span></div>
                                    <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${reply.is_deleted ? "italic text-soft" : "text-white/75"}`}>{reply.is_deleted ? "This reply was removed." : reply.body}</p>
                                    {!reply.is_deleted && <div className="mt-2 flex gap-3">{<Link href={`/report?targetType=comment&targetId=${reply.id}`} className="text-xs text-soft hover:text-red-200">Report</Link>}{canRemoveReply && <form action={removeDevlogComment.bind(null, updateId, reply.id)}><button className="text-xs text-red-200">Remove</button></form>}</div>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
