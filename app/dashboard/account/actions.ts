"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never { redirect(`/dashboard/account?error=${encodeURIComponent(message)}`); }
function passwordFail(message: string): never { redirect(`/dashboard/account?passwordError=${encodeURIComponent(message)}#change-password`); }

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  const currentPassword=String(formData.get("currentPassword")||"");
  const password=String(formData.get("password")||"");
  const confirmPassword=String(formData.get("confirmPassword")||"");
  if (!currentPassword) passwordFail("Enter your current password.");
  if (password.length < 8) passwordFail("Your new password must be at least 8 characters.");
  if (password !== confirmPassword) passwordFail("The new passwords do not match.");
  if (password === currentPassword) passwordFail("Choose a new password that differs from your current password.");
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email:user.email, password:currentPassword });
  if (verifyError) passwordFail("Your current password is incorrect.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) passwordFail(error.message);
  revalidatePath("/dashboard/account");
  redirect("/dashboard/account?passwordSuccess=Password%20changed%20successfully.#change-password");
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user?.email) redirect("/login");
  const password=String(formData.get("password")||""); const confirmation=String(formData.get("confirmation")||"").trim();
  if (confirmation!=="DELETE MY ACCOUNT") fail('Type "DELETE MY ACCOUNT" exactly.'); if (!password) fail("Enter your current password.");
  const { error:authError }=await supabase.auth.signInWithPassword({email:user.email,password}); if(authError) fail("Your password is incorrect.");
  const { error }=await supabase.rpc("delete_my_account"); if(error) fail(error.message); await supabase.auth.signOut(); redirect("/?accountDeleted=true");
}
