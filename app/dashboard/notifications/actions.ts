"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("profile_id", user.id).eq("is_read", false);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/", "layout");
}
