"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ManagedContentType = "project" | "devlog" | "campaign";

function destination(messageType: "success" | "error", message: string): never {
  redirect(`/dashboard/content?${messageType}=${encodeURIComponent(message)}`);
}

function validType(value: string): value is ManagedContentType {
  return value === "project" || value === "devlog" || value === "campaign";
}

function storagePath(url: string | null | undefined) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/project-media/";
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

async function mediaForDeletion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentType: ManagedContentType,
  contentId: string,
  userId: string
) {
  const urls: Array<string | null | undefined> = [];
  if (contentType === "project") {
    const [{ data: project }, { data: images }, { data: updates }] = await Promise.all([
      supabase.from("projects").select("icon_url,cover_url").eq("id", contentId).eq("owner_id", userId).maybeSingle(),
      supabase.from("project_images").select("image_url,projects!inner(owner_id)").eq("project_id", contentId).eq("projects.owner_id", userId),
      supabase.from("project_updates").select("image_url,background_image_url,projects!inner(owner_id)").eq("project_id", contentId).eq("projects.owner_id", userId)
    ]);
    urls.push(project?.icon_url, project?.cover_url);
    for (const image of images ?? []) urls.push(image.image_url);
    for (const update of updates ?? []) urls.push(update.image_url, update.background_image_url);
  } else if (contentType === "devlog") {
    const { data: update } = await supabase
      .from("project_updates")
      .select("image_url,background_image_url,projects!inner(owner_id)")
      .eq("id", contentId)
      .eq("projects.owner_id", userId)
      .maybeSingle();
    urls.push(update?.image_url, update?.background_image_url);
  }
  return urls.map(storagePath).filter((path): path is string => Boolean(path));
}

async function runContentAction(
  contentType: ManagedContentType,
  contentId: string,
  operation: "archive" | "restore" | "delete"
) {
  if (!validType(contentType)) destination("error", "Invalid content type.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mediaPaths = operation === "delete"
    ? await mediaForDeletion(supabase, contentType, contentId, user.id)
    : [];
  const rpc = operation === "delete" ? "delete_owned_content" : "set_owned_content_archived";
  const args = operation === "delete"
    ? { p_content_type: contentType, p_content_id: contentId }
    : { p_content_type: contentType, p_content_id: contentId, p_archive: operation === "archive" };
  const { error } = await supabase.rpc(rpc, args);
  if (error) destination("error", error.message);
  if (mediaPaths.length > 0) {
    await supabase.storage.from("project-media").remove(mediaPaths);
  }

  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/devlogs");
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/analytics");

  const label = contentType === "devlog" ? "Devlog" : contentType === "campaign" ? "Campaign" : "Project";
  const verb = operation === "archive" ? "archived" : operation === "restore" ? "restored" : "permanently deleted";
  destination("success", `${label} ${verb}.`);
}

export async function archiveContent(contentType: ManagedContentType, contentId: string) {
  return runContentAction(contentType, contentId, "archive");
}

export async function restoreContent(contentType: ManagedContentType, contentId: string) {
  return runContentAction(contentType, contentId, "restore");
}

export async function deleteContent(contentType: ManagedContentType, contentId: string) {
  return runContentAction(contentType, contentId, "delete");
}
