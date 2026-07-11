"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const validTypes = new Set(["app", "game"]);
const validStages = new Set(["prototype", "alpha", "beta", "released"]);
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFileSize = 5 * 1024 * 1024;
const bucketName = "project-media";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function optionalUrl(value: string, path: string): string | null {
  const cleaned = value.trim();
  if (!cleaned) return null;

  try {
    const url = new URL(cleaned);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    fail(path, `Invalid URL: ${cleaned}`);
  }
}

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";
}

function cleanFileName(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() || "jpg";
  return `${crypto.randomUUID()}.${extension.replace(/[^a-z0-9]/g, "")}`;
}

function asImageFile(value: FormDataEntryValue | null, path: string, label: string): File | null {
  if (!(value instanceof File) || value.size === 0) return null;
  if (!allowedMimeTypes.has(value.type)) fail(path, `${label} must be a PNG, JPG or WebP image.`);
  if (value.size > maxFileSize) fail(path, `${label} may not exceed 5 MB.`);
  return value;
}

function getFields(formData: FormData, path: string) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const genre = String(formData.get("genre") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const knownIssues = String(formData.get("knownIssues") ?? "").trim();
  const isPublished = formData.get("isPublished") === "true";

  if (!name || !platform || !shortDescription) fail(path, "Project name, platform and short description are required.");
  if (name.length > 100) fail(path, "Project name may not exceed 100 characters.");
  if (shortDescription.length > 220) fail(path, "Short description may not exceed 220 characters.");
  if (!validTypes.has(type)) fail(path, "Choose a valid project type.");
  if (!validStages.has(stage)) fail(path, "Choose a valid development stage.");

  return {
    name,
    type,
    stage,
    platform,
    genre: genre || null,
    short_description: shortDescription,
    description: description || null,
    testing_url: optionalUrl(String(formData.get("testingUrl") ?? ""), path),
    known_issues: knownIssues || null,
    is_published: isPublished
  };
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
  folder: string,
  file: File
): Promise<string> {
  const objectPath = `${userId}/${projectId}/${folder}/${cleanFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucketName).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
  return data.publicUrl;
}

function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

async function removeStorageUrls(supabase: Awaited<ReturnType<typeof createClient>>, urls: Array<string | null>) {
  const paths = urls.map(storagePathFromPublicUrl).filter((value): value is string => Boolean(value));
  if (paths.length > 0) await supabase.storage.from(bucketName).remove(paths);
}

async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, name: string, ignoreId?: string) {
  const baseSlug = makeSlug(name);
  let slug = baseSlug;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    let query = supabase.from("projects").select("id").eq("slug", slug);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data: existing } = await query.maybeSingle();
    if (!existing) return slug;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createProject(formData: FormData) {
  const path = "/dashboard/projects/new";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Please%20log%20in%20to%20create%20a%20project.");

  const fields = getFields(formData, path);
  const iconFile = asImageFile(formData.get("iconFile"), path, "Icon");
  const coverFile = asImageFile(formData.get("coverFile"), path, "Cover image");
  const screenshotFiles = formData.getAll("screenshotFiles")
    .map((entry, index) => asImageFile(entry, path, `Screenshot ${index + 1}`))
    .filter((file): file is File => Boolean(file));

  if (screenshotFiles.length > 10) fail(path, "You may upload a maximum of 10 screenshots.");

  const slug = await uniqueSlug(supabase, fields.name);
  const { data: project, error } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, slug, ...fields })
    .select("id")
    .single();

  if (error || !project) fail(path, error?.message || "The project could not be created.");

  const uploadedUrls: string[] = [];
  try {
    let iconUrl: string | null = null;
    let coverUrl: string | null = null;

    if (iconFile) {
      iconUrl = await uploadImage(supabase, user.id, project.id, "icon", iconFile);
      uploadedUrls.push(iconUrl);
    }
    if (coverFile) {
      coverUrl = await uploadImage(supabase, user.id, project.id, "cover", coverFile);
      uploadedUrls.push(coverUrl);
    }

    if (iconUrl || coverUrl) {
      const { error: mediaUpdateError } = await supabase.from("projects").update({ icon_url: iconUrl, cover_url: coverUrl }).eq("id", project.id);
      if (mediaUpdateError) throw new Error(mediaUpdateError.message);
    }

    if (screenshotFiles.length > 0) {
      const imageRows = [];
      for (let index = 0; index < screenshotFiles.length; index += 1) {
        const imageUrl = await uploadImage(supabase, user.id, project.id, "screenshots", screenshotFiles[index]);
        uploadedUrls.push(imageUrl);
        imageRows.push({ project_id: project.id, image_url: imageUrl, sort_order: index });
      }
      const { error: imageError } = await supabase.from("project_images").insert(imageRows);
      if (imageError) throw new Error(imageError.message);
    }
  } catch (uploadError) {
    await removeStorageUrls(supabase, uploadedUrls);
    await supabase.from("projects").delete().eq("id", project.id);
    fail(path, uploadError instanceof Error ? uploadError.message : "Project media could not be uploaded.");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/discover");
  redirect(`/dashboard/projects?success=${encodeURIComponent("Project created successfully.")}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const path = `/dashboard/projects/${projectId}/edit`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Please%20log%20in%20to%20edit%20a%20project.");

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, slug, icon_url, cover_url")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.owner_id !== user.id) fail("/dashboard/projects", "Project not found or you do not have permission to edit it.");

  const fields = getFields(formData, path);
  const iconFile = asImageFile(formData.get("iconFile"), path, "Icon");
  const coverFile = asImageFile(formData.get("coverFile"), path, "Cover image");
  const screenshotFiles = formData.getAll("screenshotFiles")
    .map((entry, index) => asImageFile(entry, path, `Screenshot ${index + 1}`))
    .filter((file): file is File => Boolean(file));
  const removeScreenshotIds = formData.getAll("removeScreenshotIds").map(String);
  const removeIcon = formData.get("removeIcon") === "true";
  const removeCover = formData.get("removeCover") === "true";

  const { data: currentImages } = await supabase
    .from("project_images")
    .select("id, image_url, sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  const remainingCount = (currentImages ?? []).filter((image) => !removeScreenshotIds.includes(image.id)).length;
  if (remainingCount + screenshotFiles.length > 10) fail(path, "A project may have a maximum of 10 screenshots.");

  const newSlug = fields.name === undefined ? project.slug : await uniqueSlug(supabase, fields.name, projectId);
  let iconUrl = removeIcon ? null : project.icon_url;
  let coverUrl = removeCover ? null : project.cover_url;
  const uploadedUrls: string[] = [];

  try {
    if (iconFile) {
      iconUrl = await uploadImage(supabase, user.id, projectId, "icon", iconFile);
      uploadedUrls.push(iconUrl);
    }
    if (coverFile) {
      coverUrl = await uploadImage(supabase, user.id, projectId, "cover", coverFile);
      uploadedUrls.push(coverUrl);
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({ ...fields, slug: newSlug, icon_url: iconUrl, cover_url: coverUrl, updated_at: new Date().toISOString() })
      .eq("id", projectId)
      .eq("owner_id", user.id);
    if (updateError) throw new Error(updateError.message);

    const imagesToRemove = (currentImages ?? []).filter((image) => removeScreenshotIds.includes(image.id));
    if (imagesToRemove.length > 0) {
      const { error: deleteError } = await supabase.from("project_images").delete().in("id", imagesToRemove.map((image) => image.id));
      if (deleteError) throw new Error(deleteError.message);
      await removeStorageUrls(supabase, imagesToRemove.map((image) => image.image_url));
    }

    const keptImages = (currentImages ?? []).filter((image) => !removeScreenshotIds.includes(image.id));
    if (screenshotFiles.length > 0) {
      const rows = [];
      for (let index = 0; index < screenshotFiles.length; index += 1) {
        const imageUrl = await uploadImage(supabase, user.id, projectId, "screenshots", screenshotFiles[index]);
        uploadedUrls.push(imageUrl);
        rows.push({ project_id: projectId, image_url: imageUrl, sort_order: keptImages.length + index });
      }
      const { error: insertError } = await supabase.from("project_images").insert(rows);
      if (insertError) throw new Error(insertError.message);
    }

    const oldUrls: Array<string | null> = [];
    if ((removeIcon || iconFile) && project.icon_url && project.icon_url !== iconUrl) oldUrls.push(project.icon_url);
    if ((removeCover || coverFile) && project.cover_url && project.cover_url !== coverUrl) oldUrls.push(project.cover_url);
    await removeStorageUrls(supabase, oldUrls);
  } catch (updateError) {
    await removeStorageUrls(supabase, uploadedUrls);
    fail(path, updateError instanceof Error ? updateError.message : "The project could not be updated.");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/discover");
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/projects/${newSlug}`);
  redirect(`/dashboard/projects?success=${encodeURIComponent("Project updated successfully.")}`);
}
