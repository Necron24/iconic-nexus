"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UPDATE_TYPES = new Set(["development", "release", "bug_fixes", "testing_needed", "major_update", "announcement"]);

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function optionalUrl(value: FormDataEntryValue | null, path: string, label: string) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    fail(path, `${label} must be a valid http or https URL.`);
  }
}

async function getOwnedProject(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: project } = await supabase.from("projects").select("id,owner_id,slug,name").eq("id", projectId).maybeSingle();
  if (!project || project.owner_id !== user.id) fail("/dashboard/projects", "Project not found or access denied.");
  return { supabase, user, project };
}

function readFields(formData: FormData, path: string) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const versionLabel = String(formData.get("versionLabel") ?? "").trim() || null;
  const updateType = String(formData.get("updateType") ?? "development");
  if (title.length < 3 || title.length > 120) fail(path, "Title must be between 3 and 120 characters.");
  if (body.length < 10 || body.length > 10000) fail(path, "Devlog must be between 10 and 10,000 characters.");
  if (versionLabel && versionLabel.length > 40) fail(path, "Version must be 40 characters or fewer.");
  if (!UPDATE_TYPES.has(updateType)) fail(path, "Invalid update type.");
  return {
    title,
    body,
    version_label: versionLabel,
    update_type: updateType,
    image_url: optionalUrl(formData.get("imageUrl"), path, "Image URL"),
    release_url: optionalUrl(formData.get("releaseUrl"), path, "Release URL"),
    is_published: formData.get("isPublished") === "true"
  };
}

export async function createProjectUpdate(projectId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/updates/new`;
  const { supabase, user, project } = await getOwnedProject(projectId);
  const fields = readFields(formData, path);
  const { error } = await supabase.from("project_updates").insert({ project_id: projectId, author_id: user.id, ...fields });
  if (error) fail(path, error.message);
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/discover");
  revalidatePath("/wall-of-fame");
  revalidatePath(`/dashboard/projects/${projectId}/updates`);
  redirect(`/dashboard/projects/${projectId}/updates?success=${encodeURIComponent("Project update created successfully.")}`);
}

export async function updateProjectUpdate(projectId: string, updateId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/updates/${updateId}/edit`;
  const { supabase, user, project } = await getOwnedProject(projectId);
  const fields = readFields(formData, path);
  const { error } = await supabase.from("project_updates").update(fields).eq("id", updateId).eq("project_id", projectId).eq("author_id", user.id);
  if (error) fail(path, error.message);
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/discover");
  revalidatePath("/wall-of-fame");
  revalidatePath(`/dashboard/projects/${projectId}/updates`);
  redirect(`/dashboard/projects/${projectId}/updates?success=${encodeURIComponent("Project update saved.")}`);
}

export async function deleteProjectUpdate(projectId: string, updateId: string) {
  const { supabase, user, project } = await getOwnedProject(projectId);
  const { error } = await supabase.from("project_updates").delete().eq("id", updateId).eq("project_id", projectId).eq("author_id", user.id);
  if (error) fail(`/dashboard/projects/${projectId}/updates`, error.message);
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/discover");
  revalidatePath("/wall-of-fame");
  redirect(`/dashboard/projects/${projectId}/updates?success=${encodeURIComponent("Project update deleted.")}`);
}
