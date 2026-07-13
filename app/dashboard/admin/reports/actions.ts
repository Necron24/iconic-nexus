"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");
  return { supabase, user };
}

export async function resolveReport(formData: FormData) {
  const id = String(formData.get("id") || "");
  const note = String(formData.get("resolutionNote") || "").trim();
  const { supabase, user } = await requireAdmin();
  await supabase.from("reports").update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id, resolution_note: note || null }).eq("id", id);
  revalidatePath("/dashboard/admin/reports");
}

export async function setUserStatus(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const status = String(formData.get("status") || "active");
  const reason = String(formData.get("reason") || "").trim();
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_user_status", { p_user_id: userId, p_status: status, p_reason: reason || null });
  if (error) redirect(`/dashboard/admin/reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/admin/reports");
}

export async function setProjectVisibility(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const hidden = formData.get("hidden") === "true";
  const reason = String(formData.get("reason") || "").trim();
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_project_visibility", { p_project_id: projectId, p_hidden: hidden, p_reason: reason || null });
  if (error) redirect(`/dashboard/admin/reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/discover");
  revalidatePath("/");
}

export async function resolveDispute(formData: FormData) {
  const disputeId = String(formData.get("disputeId") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("resolutionNote") || "").trim();
  if (!["approve_tester", "uphold_developer"].includes(decision)) redirect("/dashboard/admin/reports?error=Choose%20a%20valid%20dispute%20decision.");
  if (note.length < 10) redirect("/dashboard/admin/reports?error=Add%20a%20clear%20resolution%20note.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_resolve_feedback_dispute", { p_dispute_id: disputeId, p_approve_tester: decision === "approve_tester", p_resolution_note: note });
  if (error) redirect(`/dashboard/admin/reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/admin/reports");
  revalidatePath("/dashboard/testing");
  revalidatePath("/dashboard/credits");
}
