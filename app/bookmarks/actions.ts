"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function safePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard/saved";
}

export async function toggleProjectBookmark(projectId: string, returnPath: string) {
  const next = safePath(returnPath);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?error=${encodeURIComponent("Please log in to save projects.")}&next=${encodeURIComponent(next)}`);

  const { data: existing } = await supabase.from("project_bookmarks")
    .select("project_id").eq("project_id", projectId).eq("profile_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("project_bookmarks").delete().eq("project_id", projectId).eq("profile_id", user.id)
    : await supabase.from("project_bookmarks").insert({ project_id: projectId, profile_id: user.id });
  if (error) redirect(`${next}${next.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);

  if (!existing) await supabase.rpc("track_analytics_event", {
    p_event_type: "save", p_target_type: "project", p_target_id: projectId,
    p_visitor_hash: null, p_source: "iconic_nexus"
  });
  revalidatePath(next);
  revalidatePath("/discover");
  revalidatePath("/dashboard/saved");
  return { saved: !existing };
}

export async function removeProjectBookmark(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("project_bookmarks").delete().eq("project_id", projectId).eq("profile_id", user.id);
  revalidatePath("/dashboard/saved");
  revalidatePath("/discover");
}
