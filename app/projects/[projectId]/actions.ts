"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["excited","interested","test","innovative","love"]);
export async function toggleProjectReaction(projectId:string, slug:string, formData:FormData) {
  const reaction=String(formData.get("reaction")||"");
  if(!allowed.has(reaction)) return;
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/login?next=${encodeURIComponent(`/projects/${slug}`)}`);
  const {data:existing}=await supabase.from("project_reactions").select("reaction").eq("project_id",projectId).eq("profile_id",user.id).maybeSingle();
  if(existing?.reaction===reaction) await supabase.from("project_reactions").delete().eq("project_id",projectId).eq("profile_id",user.id);
  else if(existing) await supabase.from("project_reactions").update({reaction,updated_at:new Date().toISOString()}).eq("project_id",projectId).eq("profile_id",user.id);
  else await supabase.from("project_reactions").insert({project_id:projectId,profile_id:user.id,reaction});
  revalidatePath(`/projects/${slug}`);
}
