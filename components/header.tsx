import Link from "next/link";
import { Bell } from "lucide-react";
import { MobileMenu } from "@/components/mobile-menu";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export async function Header() {
  let user = null;
  let unread = 0;

  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;

    if (user) {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id)
        .eq("is_read", false);
      unread = count ?? 0;
    }
  } catch {
    user = null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-xl">
      <div className="container-page flex h-20 items-center justify-between gap-3">
        <BrandLogo priority className="shrink-0" />

        <nav className="hidden items-center gap-6 text-sm font-semibold text-soft lg:flex">
          <Link href="/discover" className="transition hover:text-white">Discover</Link>
          <Link href="/campaigns" className="transition hover:text-white">Campaigns</Link>
          <Link href="/wall-of-fame" className="transition hover:text-white">Wall of Fame</Link>
          {user && <Link href="/dashboard" className="transition hover:text-white">Dashboard</Link>}
          <Link href="/help" className="transition hover:text-white">Help</Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,.08)] transition hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[10px] font-black text-ink">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <span className="max-w-48 truncate text-sm text-soft">{user.email}</span>
              <form action={logout}>
                <button type="submit" className="btn-secondary !px-4 !py-2">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary !px-4 !py-2">Log in</Link>
              <Link href="/register" className="btn-primary !px-4 !py-2">Join the Nexus</Link>
            </>
          )}
        </div>

        <MobileMenu signedIn={Boolean(user)} unread={unread} email={user?.email ?? null} />
      </div>
    </header>
  );
}
