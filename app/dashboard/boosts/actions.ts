"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function buyBoost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const boostCode = String(formData.get("boostCode") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const { error } = await supabase.rpc("purchase_content_boost", {
    p_boost_code: boostCode,
    p_target_id: targetId
  });
  if (error) redirect(`/dashboard/boosts?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/discover");
  revalidatePath("/campaigns");
  revalidatePath("/dashboard/boosts");
  revalidatePath("/dashboard/credits");
  redirect(`/dashboard/boosts?success=${encodeURIComponent("Boost activated successfully.")}`);
}
