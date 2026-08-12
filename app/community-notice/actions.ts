"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acknowledgeCommunityPurpose() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc("acknowledge_community_purpose_notice");
  if (!error) revalidatePath("/", "layout");
  return { ok: !error };
}
