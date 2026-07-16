"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function readInteger(data: FormData, name: string, min: number, max: number, path: string) {
  const value = Number(String(data.get(name) ?? ""));
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(path, `${name} must be between ${min} and ${max}.`);
  }
  return value;
}

async function ownedProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string
) {
  const { data } = await supabase
    .from("projects")
    .select("id, owner_id, name, slug")
    .eq("id", projectId)
    .maybeSingle();

  return data && data.owner_id === userId ? data : null;
}

export async function createCampaign(projectId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/campaigns/new`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const project = await ownedProject(supabase, projectId, user.id);
  if (!project) fail("/dashboard/projects", "Project not found.");

  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  if (!title || !instructions) fail(path, "Campaign title and instructions are required.");

  const testerGoal = readInteger(formData, "testerGoal", 1, 500, path);
  const durationDays = readInteger(formData, "durationDays", 1, 90, path);
  const minimumMinutes = readInteger(formData, "minimumMinutes", 1, 600, path);
  const rewardCredits = readInteger(formData, "rewardCredits", 1, 1000, path);

  const { data: campaignId, error } = await supabase.rpc("create_funded_testing_campaign", {
    p_project_id: project.id,
    p_title: title,
    p_instructions: instructions,
    p_minimum_minutes: minimumMinutes,
    p_tester_goal: testerGoal,
    p_reward_credits: rewardCredits,
    p_duration_days: durationDays,
    p_start_now: formData.get("startNow") === "true"
  });

  if (error || !campaignId) fail(path, error?.message || "Campaign could not be created.");

  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/credits");
  redirect(`/campaigns/${campaignId}?success=${encodeURIComponent("Campaign created and budget reserved successfully.")}`);
}

export async function updateCampaign(projectId: string, campaignId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/campaigns/${campaignId}/manage`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!await ownedProject(supabase, projectId, user.id)) fail("/dashboard/projects", "Project not found.");

  const { data: currentCampaign } = await supabase
    .from("testing_campaigns")
    .select("id,project_id,tester_goal,duration_days,minimum_minutes,reward_credits,status")
    .eq("id", campaignId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!currentCampaign) fail("/dashboard/projects", "Campaign not found.");
  if (["completed", "cancelled"].includes(currentCampaign.status)) fail(path, "Closed campaigns cannot be edited.");

  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  if (!title || !instructions) fail(path, "Campaign title and instructions are required.");

  const testerGoal = readInteger(formData, "testerGoal", 1, 500, path);
  const durationDays = readInteger(formData, "durationDays", 1, 90, path);
  const minimumMinutes = readInteger(formData, "minimumMinutes", 1, 600, path);
  const rewardCredits = readInteger(formData, "rewardCredits", 1, 1000, path);

  const { error } = await supabase.rpc("update_funded_testing_campaign", {
    p_campaign_id: campaignId,
    p_title: title,
    p_instructions: instructions,
    p_minimum_minutes: minimumMinutes,
    p_tester_goal: testerGoal,
    p_reward_credits: rewardCredits,
    p_duration_days: durationDays
  });

  if (error) fail(path, error.message);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/credits");
  redirect(`${path}?success=${encodeURIComponent("Campaign and reserved budget updated.")}`);
}

export async function changeCampaignStatus(projectId: string, campaignId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/campaigns/${campaignId}/manage`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!await ownedProject(supabase, projectId, user.id)) fail("/dashboard/projects", "Project not found.");

  const nextStatus = String(formData.get("status") ?? "");
  if (!["active", "paused", "completed", "cancelled"].includes(nextStatus)) fail(path, "Invalid campaign status.");

  const { error } = await supabase.rpc("change_funded_campaign_status", {
    p_campaign_id: campaignId,
    p_next_status: nextStatus
  });
  if (error) fail(path, error.message);

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/testing");
  revalidatePath("/dashboard/credits");
  redirect(`${path}?success=${encodeURIComponent(`Campaign is now ${nextStatus}.`)}`);
}

export async function joinCampaign(campaignId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?error=${encodeURIComponent("Please log in to join a campaign.")}`);

  const { data, error } = await supabase.rpc("join_testing_campaign", { p_campaign_id: campaignId });
  if (error) redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);
  if (data !== "joined" && data !== "already_joined") {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent("The campaign could not be joined.")}`);
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/dashboard/testing");
  redirect(`/campaigns/${campaignId}?success=${encodeURIComponent(data === "already_joined" ? "You already joined this campaign." : "You joined the campaign successfully.")}`);
}