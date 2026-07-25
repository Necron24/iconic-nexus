"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateImageFile } from "@/lib/security/image-file";
import {
  DEFAULT_DEVLOG_STYLE,
  DEVLOG_BACKGROUNDS,
  DEVLOG_BODY_FONTS,
  DEVLOG_CARD_STYLES,
  DEVLOG_HEADING_FONTS,
  DEVLOG_IMAGE_FITS,
  DEVLOG_LAYOUTS,
  DEVLOG_TEXT_ALIGNMENTS,
  DEVLOG_UPDATE_TYPES,
  normalizeHexColor
} from "@/lib/devlog-style";

const UPDATE_TYPES = new Set<string>(DEVLOG_UPDATE_TYPES);
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 5 * 1024 * 1024;
const BUCKET_NAME = "project-media";

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

function valueFromSet(
  formData: FormData,
  name: string,
  allowed: readonly string[],
  fallback: string,
  path: string
) {
  const value = String(formData.get(name) ?? fallback);
  if (!allowed.includes(value)) fail(path, `Invalid ${name} option.`);
  return value;
}

function imageFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function cleanFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${crypto.randomUUID()}.${extension}`;
}

async function uploadDevlogImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
  folder: "feature" | "background",
  file: File
) {
  await validateImageFile(file, MAX_IMAGE_BYTES, folder === "feature" ? "Devlog image" : "Background image");
  const objectPath = `${userId}/${projectId}/devlogs/${folder}/${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(
    objectPath,
    Buffer.from(await file.arrayBuffer()),
    { contentType: file.type, upsert: false }
  );
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET_NAME).getPublicUrl(objectPath).data.publicUrl;
}

function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

async function removeUploadedImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  urls: Array<string | null | undefined>
) {
  const paths = urls.map(storagePathFromPublicUrl).filter((value): value is string => Boolean(value));
  if (paths.length) await supabase.storage.from(BUCKET_NAME).remove(paths);
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
  const headingFont = valueFromSet(formData, "headingFont", DEVLOG_HEADING_FONTS, DEFAULT_DEVLOG_STYLE.heading_font, path);
  const bodyFont = valueFromSet(formData, "bodyFont", DEVLOG_BODY_FONTS, DEFAULT_DEVLOG_STYLE.body_font, path);
  const backgroundStyle = valueFromSet(formData, "backgroundStyle", DEVLOG_BACKGROUNDS, DEFAULT_DEVLOG_STYLE.background_style, path);
  const cardStyle = valueFromSet(formData, "cardStyle", DEVLOG_CARD_STYLES, DEFAULT_DEVLOG_STYLE.card_style, path);
  const layoutStyle = valueFromSet(formData, "layoutStyle", DEVLOG_LAYOUTS, DEFAULT_DEVLOG_STYLE.layout_style, path);
  const textAlign = valueFromSet(formData, "textAlign", DEVLOG_TEXT_ALIGNMENTS, DEFAULT_DEVLOG_STYLE.text_align, path);
  const imageFit = valueFromSet(formData, "imageFit", DEVLOG_IMAGE_FITS, DEFAULT_DEVLOG_STYLE.image_fit, path);

  return {
    title,
    body,
    version_label: versionLabel,
    update_type: updateType,
    image_url: optionalUrl(formData.get("imageUrl"), path, "Image URL"),
    background_image_url: optionalUrl(formData.get("backgroundImageUrl"), path, "Background image URL"),
    release_url: optionalUrl(formData.get("releaseUrl"), path, "Release URL"),
    is_published: formData.get("isPublished") === "true",
    accent_color: normalizeHexColor(formData.get("accentColor"), DEFAULT_DEVLOG_STYLE.accent_color),
    background_color: normalizeHexColor(formData.get("backgroundColor"), DEFAULT_DEVLOG_STYLE.background_color),
    background_style: backgroundStyle,
    heading_font: headingFont,
    body_font: bodyFont,
    card_style: cardStyle,
    layout_style: layoutStyle,
    text_align: textAlign,
    image_fit: imageFit
  };
}

export async function createProjectUpdate(projectId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/updates/new`;
  const { supabase, user, project } = await getOwnedProject(projectId);
  const fields = readFields(formData, path);
  const featureFile = imageFile(formData.get("imageFile"));
  const backgroundFile = imageFile(formData.get("backgroundImageFile"));
  if ((featureFile?.size ?? 0) + (backgroundFile?.size ?? 0) > MAX_TOTAL_IMAGE_BYTES) {
    fail(path, "The devlog image and background together may not exceed 5 MB.");
  }

  const uploaded: string[] = [];
  try {
    if (featureFile) {
      fields.image_url = await uploadDevlogImage(supabase, user.id, projectId, "feature", featureFile);
      uploaded.push(fields.image_url);
    }
    if (backgroundFile) {
      fields.background_image_url = await uploadDevlogImage(supabase, user.id, projectId, "background", backgroundFile);
      uploaded.push(fields.background_image_url);
    }
    const { error } = await supabase.from("project_updates").insert({
      project_id: projectId,
      author_id: user.id,
      ...fields,
      published_at: fields.is_published ? new Date().toISOString() : null
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    await removeUploadedImages(supabase, uploaded);
    fail(path, error instanceof Error ? error.message : "The update could not be created.");
  }
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
  const { data: current } = await supabase
    .from("project_updates")
    .select("image_url,background_image_url,is_published,published_at")
    .eq("id", updateId)
    .eq("project_id", projectId)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!current) fail(path, "Project update not found.");

  const featureFile = imageFile(formData.get("imageFile"));
  const backgroundFile = imageFile(formData.get("backgroundImageFile"));
  if ((featureFile?.size ?? 0) + (backgroundFile?.size ?? 0) > MAX_TOTAL_IMAGE_BYTES) {
    fail(path, "The devlog image and background together may not exceed 5 MB.");
  }

  const uploaded: string[] = [];
  const oldUrls: Array<string | null> = [];
  try {
    if (formData.get("removeImage") === "true") {
      fields.image_url = null;
      oldUrls.push(current.image_url);
    }
    if (formData.get("removeBackgroundImage") === "true") {
      fields.background_image_url = null;
      oldUrls.push(current.background_image_url);
    }
    if (featureFile) {
      fields.image_url = await uploadDevlogImage(supabase, user.id, projectId, "feature", featureFile);
      uploaded.push(fields.image_url);
      oldUrls.push(current.image_url);
    }
    if (backgroundFile) {
      fields.background_image_url = await uploadDevlogImage(supabase, user.id, projectId, "background", backgroundFile);
      uploaded.push(fields.background_image_url);
      oldUrls.push(current.background_image_url);
    }

    const publishedAt = fields.is_published
      ? current.published_at ?? new Date().toISOString()
      : null;
    const { error } = await supabase
      .from("project_updates")
      .update({ ...fields, published_at: publishedAt })
      .eq("id", updateId)
      .eq("project_id", projectId)
      .eq("author_id", user.id);
    if (error) throw new Error(error.message);
    await removeUploadedImages(supabase, oldUrls.filter((url) => !uploaded.includes(url ?? "")));
  } catch (error) {
    await removeUploadedImages(supabase, uploaded);
    fail(path, error instanceof Error ? error.message : "The update could not be saved.");
  }
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/discover");
  revalidatePath("/wall-of-fame");
  revalidatePath(`/dashboard/projects/${projectId}/updates`);
  redirect(`/dashboard/projects/${projectId}/updates?success=${encodeURIComponent("Project update saved.")}`);
}

export async function deleteProjectUpdate(projectId: string, updateId: string) {
  const { supabase, user, project } = await getOwnedProject(projectId);
  const { data: update } = await supabase
    .from("project_updates")
    .select("image_url,background_image_url")
    .eq("id", updateId)
    .eq("project_id", projectId)
    .eq("author_id", user.id)
    .maybeSingle();
  const { error } = await supabase.from("project_updates").delete().eq("id", updateId).eq("project_id", projectId).eq("author_id", user.id);
  if (error) fail(`/dashboard/projects/${projectId}/updates`, error.message);
  if (update) await removeUploadedImages(supabase, [update.image_url, update.background_image_url]);
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/discover");
  revalidatePath("/wall-of-fame");
  redirect(`/dashboard/projects/${projectId}/updates?success=${encodeURIComponent("Project update deleted.")}`);
}
