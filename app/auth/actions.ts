"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/security/turnstile";

function encodeMessage(type: "error" | "success", message: string) {
  return `${type}=${encodeURIComponent(message)}`;
}

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const deploymentHost = process.env.VERCEL_URL?.trim();

  const resolved = configured
    || (productionHost ? `https://${productionHost}` : "")
    || (deploymentHost ? `https://${deploymentHost}` : "")
    || "http://localhost:3000";

  return resolved.replace(/\/$/, "");
}

export async function login(formData: FormData) {
  if (!(await verifyTurnstile(formData, "login"))) redirect(`/login?${encodeMessage("error", "Security verification failed. Refresh the page and try again.")}`);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect(`/login?${encodeMessage("error", "Enter your email address and password.")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?${encodeMessage("error", "The email address or password is incorrect.")}`);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  if (!(await verifyTurnstile(formData, "register"))) redirect(`/register?${encodeMessage("error", "Security verification failed. Refresh the page and try again.")}`);
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const role = String(formData.get("role") ?? "both");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const acceptedTerms = formData.get("acceptedTerms") === "true";

  if (!username || !email || !password) redirect(`/register?${encodeMessage("error", "Username, email and password are required.")}`);
  if (!acceptedTerms) redirect(`/register?${encodeMessage("error", "You must accept the Terms, Privacy Policy and Community Guidelines.")}`);
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) redirect(`/register?${encodeMessage("error", "Username must be 3–30 characters and use only letters, numbers or underscores.")}`);
  if (password.length < 8) redirect(`/register?${encodeMessage("error", "Password must contain at least 8 characters.")}`);
  if (password !== confirmPassword) redirect(`/register?${encodeMessage("error", "The passwords do not match.")}`);
  if (!["tester", "developer", "both"].includes(role)) redirect(`/register?${encodeMessage("error", "Choose a valid account role.")}`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
      data: { username, display_name: displayName || username, country, role, accepted_terms_at: new Date().toISOString() }
    }
  });
  if (error) redirect(`/register?${encodeMessage("error", error.message)}`);
  if (data.session) { revalidatePath("/", "layout"); redirect("/dashboard"); }
  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function requestPasswordReset(formData: FormData) {
  if (!(await verifyTurnstile(formData, "password_reset"))) redirect(`/forgot-password?${encodeMessage("error", "Security verification failed. Refresh the page and try again.")}`);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect(`/forgot-password?${encodeMessage("error", "Enter your email address.")}`);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/confirm?next=/update-password` });
  redirect(`/forgot-password?${encodeMessage("success", "If an account exists for that email, a password reset link has been sent.")}`);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) redirect(`/update-password?${encodeMessage("error", "Password must contain at least 8 characters.")}`);
  if (password !== confirmPassword) redirect(`/update-password?${encodeMessage("error", "The passwords do not match.")}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/forgot-password?${encodeMessage("error", "Your reset link has expired. Request a new one.")}`);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/update-password?${encodeMessage("error", error.message)}`);
  redirect(`/login?${encodeMessage("success", "Your password has been updated. You can now log in.")}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?success=You%20have%20been%20logged%20out.");
}
