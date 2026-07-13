"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/dashboard/account?error=${encodeURIComponent(message)}`);
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "").trim();
  if (confirmation !== "DELETE MY ACCOUNT") fail('Type "DELETE MY ACCOUNT" exactly.');
  if (!password) fail("Enter your current password.");

  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (authError) fail("Your password is incorrect.");

  const { error } = await supabase.rpc("delete_my_account");
  if (error) fail(error.message);
  await supabase.auth.signOut();
  redirect("/?accountDeleted=true");
}
