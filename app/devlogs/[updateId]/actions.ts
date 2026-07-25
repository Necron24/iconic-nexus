"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const REACTIONS = new Set(["fire", "love", "clap", "helpful"]);

async function trackEngagement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventType: "reaction" | "save" | "follow" | "comment",
  targetType: "devlog" | "project",
  targetId: string
) {
  await supabase.rpc("track_analytics_event", {
    p_event_type: eventType,
    p_target_type: targetType,
    p_target_id: targetId,
    p_visitor_hash: null,
    p_source: "iconic_nexus"
  });
}

function detailPath(updateId: string) {
  return `/devlogs/${updateId}`;
}

function fail(updateId: string, message: string): never {
  redirect(`${detailPath(updateId)}?error=${encodeURIComponent(message)}#community`);
}

async function authenticatedClient(updateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?error=${encodeURIComponent("Log in to join the devlog conversation.")}&next=${encodeURIComponent(detailPath(updateId))}`);
  }
  return { supabase, user };
}

export async function toggleDevlogReaction(updateId: string, formData: FormData) {
  const reaction = String(formData.get("reaction") ?? "");
  if (!REACTIONS.has(reaction)) fail(updateId, "Choose a valid reaction.");
  const { supabase, user } = await authenticatedClient(updateId);
  const { data: existing } = await supabase
    .from("devlog_reactions")
    .select("reaction")
    .eq("update_id", updateId)
    .eq("profile_id", user.id)
    .maybeSingle();

  let added = false;
  if (existing?.reaction === reaction) {
    const { error } = await supabase.from("devlog_reactions").delete().eq("update_id", updateId).eq("profile_id", user.id);
    if (error) fail(updateId, error.message);
  } else if (existing) {
    const { error } = await supabase
      .from("devlog_reactions")
      .update({ reaction, updated_at: new Date().toISOString() })
      .eq("update_id", updateId)
      .eq("profile_id", user.id);
    if (error) fail(updateId, error.message);
    added = true;
  } else {
    const { error } = await supabase.from("devlog_reactions").insert({ update_id: updateId, profile_id: user.id, reaction });
    if (error) fail(updateId, error.message);
    added = true;
  }
  if (added) await trackEngagement(supabase, "reaction", "devlog", updateId);

  revalidatePath(detailPath(updateId));
  revalidatePath("/devlogs");
}

export async function toggleDevlogBookmark(updateId: string) {
  const { supabase, user } = await authenticatedClient(updateId);
  const { data: existing } = await supabase
    .from("devlog_bookmarks")
    .select("update_id")
    .eq("update_id", updateId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("devlog_bookmarks").delete().eq("update_id", updateId).eq("profile_id", user.id)
    : await supabase.from("devlog_bookmarks").insert({ update_id: updateId, profile_id: user.id });
  if (error) fail(updateId, error.message);
  if (!existing) await trackEngagement(supabase, "save", "devlog", updateId);
  revalidatePath(detailPath(updateId));
  revalidatePath("/dashboard/saved");
}

export async function toggleProjectFollow(updateId: string, projectId: string) {
  const { supabase, user } = await authenticatedClient(updateId);
  const { data: project } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!project) fail(updateId, "Project not found.");
  if (project.owner_id === user.id) fail(updateId, "You already own this project.");

  const { data: existing } = await supabase
    .from("project_follows")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("project_follows").delete().eq("project_id", projectId).eq("profile_id", user.id)
    : await supabase.from("project_follows").insert({ project_id: projectId, profile_id: user.id });
  if (error) fail(updateId, error.message);
  if (!existing) await trackEngagement(supabase, "follow", "project", projectId);
  revalidatePath(detailPath(updateId));
}

export async function addDevlogComment(updateId: string, formData: FormData) {
  const { supabase, user } = await authenticatedClient(updateId);
  const body = String(formData.get("body") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (body.length < 2 || body.length > 2000) fail(updateId, "Comments must be between 2 and 2,000 characters.");

  const { error } = await supabase.from("devlog_comments").insert({
    update_id: updateId,
    author_id: user.id,
    parent_id: parentId,
    body
  });
  if (error) fail(updateId, error.message);
  await trackEngagement(supabase, "comment", "devlog", updateId);

  revalidatePath(detailPath(updateId));
  revalidatePath("/devlogs");
  redirect(`${detailPath(updateId)}#comments`);
}

export async function removeDevlogComment(updateId: string, commentId: string) {
  const { supabase } = await authenticatedClient(updateId);
  const { error } = await supabase
    .from("devlog_comments")
    .update({ is_deleted: true, body: "Comment removed", updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("update_id", updateId);
  if (error) fail(updateId, error.message);

  revalidatePath(detailPath(updateId));
  revalidatePath("/devlogs");
}
