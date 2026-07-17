import Link from "next/link";
import { MobileMenu } from "@/components/mobile-menu";
import { BrandLogo } from "@/components/brand-logo";
import { NotificationPopover, type HeaderNotification } from "@/components/notification-popover";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export async function Header() {
  let user = null;
  let unread = 0;
  let notifications: HeaderNotification[] = [];

  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;

    if (user) {
      const [{ count }, { data }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("is_read", false),
        supabase
          .from("notifications")
          .select("id, title, message, link_url, is_read, created_at")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      unread = count ?? 0;
      notifications = (data ?? []) as HeaderNotification[];
    }
  } catch {
    user = null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-xl">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <BrandLogo priority className="shrink-0" />

        <nav className="hidden items-center gap-6 text-sm font-semibold text-soft lg:flex">
          <Link href="/discover" className="hover:text-white">Discover</Link>
          <Link href="/campaigns" className="hover:text-white">Campaigns</Link>
          <Link href="/wall-of-fame" className="hover:text-white">Wall of Fame</Link>
          {user && <Link href="/dashboard" className="hover:text-white">Dashboard</Link>}
          <Link href="/help" className="hover:text-white">Help</Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <NotificationPopover unread={unread} notifications={notifications} />
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

        <div className="flex items-center gap-2 lg:hidden">
          {user && <NotificationPopover unread={unread} notifications={notifications} />}
          <MobileMenu signedIn={Boolean(user)} unread={unread} />
        </div>
      </div>
    </header>
  );
}
