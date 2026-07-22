"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = new Set(["tester", "developer", "both"]);

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const requestedRole = String(formData.get("role") || "both");
  const role = allowedRoles.has(requestedRole) ? requestedRole : "both";

  await supabase
    .from("profiles")
    .update({
      onboarding_completed: true,
      role,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/profile");
}

export async function restartOnboarding() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ onboarding_completed: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
