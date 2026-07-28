"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safeReturnPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard/following";
}

async function authenticated(returnPath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const next = safeReturnPath(returnPath);
    redirect(`/login?error=${encodeURIComponent("Please log in to follow content.")}&next=${encodeURIComponent(next)}`);
  }
  return { supabase, user };
}

async function trackFollow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: "profile" | "project" | "campaign",
  targetId: string
) {
  await supabase.rpc("track_analytics_event", {
    p_event_type: "follow",
    p_target_type: targetType,
    p_target_id: targetId,
    p_visitor_hash: null,
    p_source: "iconic_nexus"
  });
}

function refresh(returnPath: string) {
  revalidatePath(returnPath);
  revalidatePath("/dashboard/following");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
}

export async function toggleCreatorFollow(creatorId: string, returnPath: string) {
  const next = safeReturnPath(returnPath);
  const { supabase, user } = await authenticated(next);
  if (creatorId === user.id) redirect(next);

  const { data: creator } = await supabase.from("profiles").select("id").eq("id", creatorId).maybeSingle();
  if (!creator) redirect(next);
  const { data: existing } = await supabase.from("creator_follows")
    .select("creator_id").eq("creator_id", creatorId).eq("follower_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("creator_follows").delete().eq("creator_id", creatorId).eq("follower_id", user.id)
    : await supabase.from("creator_follows").insert({ creator_id: creatorId, follower_id: user.id });
  if (error) redirect(`${next}${next.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  if (!existing) await trackFollow(supabase, "profile", creatorId);
  refresh(next);
  redirect(next);
}

export async function toggleProjectFollow(projectId: string, returnPath: string) {
  const next = safeReturnPath(returnPath);
  const { supabase, user } = await authenticated(next);
  const { data: project } = await supabase.from("projects").select("id,owner_id").eq("id", projectId).maybeSingle();
  if (!project || project.owner_id === user.id) redirect(next);
  const { data: existing } = await supabase.from("project_follows")
    .select("project_id").eq("project_id", projectId).eq("profile_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("project_follows").delete().eq("project_id", projectId).eq("profile_id", user.id)
    : await supabase.from("project_follows").insert({ project_id: projectId, profile_id: user.id });
  if (error) redirect(`${next}${next.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  if (!existing) await trackFollow(supabase, "project", projectId);
  refresh(next);
  redirect(next);
}

export async function toggleCampaignWatch(campaignId: string, returnPath: string) {
  const next = safeReturnPath(returnPath);
  const { supabase, user } = await authenticated(next);
  const { data: campaign } = await supabase.from("testing_campaigns")
    .select("id,projects!inner(owner_id)").eq("id", campaignId).maybeSingle();
  const project = campaign ? (Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects) : null;
  if (!campaign || project?.owner_id === user.id) redirect(next);
  const { data: existing } = await supabase.from("campaign_watches")
    .select("campaign_id").eq("campaign_id", campaignId).eq("profile_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("campaign_watches").delete().eq("campaign_id", campaignId).eq("profile_id", user.id)
    : await supabase.from("campaign_watches").insert({ campaign_id: campaignId, profile_id: user.id });
  if (error) redirect(`${next}${next.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  if (!existing) await trackFollow(supabase, "campaign", campaignId);
  refresh(next);
  redirect(next);
}
