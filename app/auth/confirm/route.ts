import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function authErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code) return String(error.code);
  return "verification_failed";
}

function authErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && error.message) return String(error.message);
  return "The authentication link could not be verified.";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = next === "/update-password" ? next : `/auth/confirmed?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(`${origin}${destination}`);
    }

    return NextResponse.redirect(
      `${origin}/auth/error?context=${next === "/update-password" ? "recovery" : "confirmation"}&code=${encodeURIComponent(authErrorCode(error))}&message=${encodeURIComponent(authErrorMessage(error))}`
    );
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const destination = type === "recovery" || next === "/update-password"
        ? next
        : `/auth/confirmed?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(`${origin}${destination}`);
    }

    return NextResponse.redirect(
      `${origin}/auth/error?context=${type === "recovery" ? "recovery" : "confirmation"}&type=${encodeURIComponent(type)}&code=${encodeURIComponent(authErrorCode(error))}&message=${encodeURIComponent(authErrorMessage(error))}`
    );
  }

  return NextResponse.redirect(`${origin}/auth/error?context=confirmation&code=invalid_link`);
}
