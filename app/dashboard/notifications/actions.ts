"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .eq("is_read", false);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/", "layout");
}

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const enabled = (name: string) => formData.get(name) === "on";
  const { error } = await supabase.from("notification_preferences").upsert({
    profile_id: user.id,
    creator_updates: enabled("creatorUpdates"),
    project_updates: enabled("projectUpdates"),
    campaign_updates: enabled("campaignUpdates"),
    community_replies: enabled("communityReplies"),
    testing_updates: enabled("testingUpdates"),
    credit_updates: enabled("creditUpdates"),
    updated_at: new Date().toISOString()
  }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/notifications");
}

export async function clearReadNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("notifications").delete().eq("profile_id", user.id).eq("is_read", true);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/", "layout");
}
