"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ onboarding_completed: true, updated_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/dashboard", "layout");
}

export async function restartOnboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from("profiles").update({ onboarding_completed: false, updated_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/dashboard", "layout");
  redirect('/dashboard');
}
