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
