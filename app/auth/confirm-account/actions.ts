"use server";

import { redirect } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const confirmationTypes: EmailOtpType[] = ["signup", "invite", "email", "email_change"];

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "/dashboard");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function confirmAccount(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const type = String(formData.get("type") ?? "signup") as EmailOtpType;
  const next = safeNext(formData.get("next"));

  if (!tokenHash || !confirmationTypes.includes(type)) {
    redirect("/auth/error?context=confirmation&code=invalid_link");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    const code = "code" in error && error.code ? String(error.code) : "verification_failed";
    redirect(`/auth/error?context=confirmation&type=${encodeURIComponent(type)}&code=${encodeURIComponent(code)}&message=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/confirmed?next=${encodeURIComponent(next)}`);
}
