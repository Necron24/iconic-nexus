import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const protectedRoute = pathname.startsWith("/dashboard");
  const guestRoute = pathname === "/login" || pathname === "/register";

  if (user && pathname !== "/account-restricted") {
    const { data: profile } = await supabase.from("profiles").select("account_status,suspension_reason").eq("id", user.id).maybeSingle();
    if (profile && profile.account_status && profile.account_status !== "active") {
      const target = request.nextUrl.clone();
      target.pathname = "/account-restricted";
      target.search = "";
      target.searchParams.set("status", profile.account_status);
      if (profile.suspension_reason) target.searchParams.set("reason", profile.suspension_reason);
      return NextResponse.redirect(target);
    }
  }

  if (protectedRoute && !user) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.searchParams.set("error", "Log in to access your dashboard.");
    return NextResponse.redirect(target);
  }

  if (guestRoute && user) {
    const target = request.nextUrl.clone();
    target.pathname = "/dashboard";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return response;
}
