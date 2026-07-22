import Link from "next/link";
import { MobileMenu } from "@/components/mobile-menu";
import { BrandLogo } from "@/components/brand-logo";
import {
  NotificationPopover,
  type HeaderNotification,
} from "@/components/notification-popover";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

type HeaderProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function ProfileAvatar({
  profile,
  size = "desktop",
}: {
  profile: HeaderProfile | null;
  size?: "desktop" | "mobile";
}) {
  const label = profile?.display_name?.trim() || profile?.username?.trim() || "User";
  const sizeClasses = size === "mobile" ? "h-10 w-10" : "h-11 w-11";

  if (profile?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={profile.avatar_url}
        alt={`${label} profile picture`}
        className={`${sizeClasses} rounded-full border border-white/15 object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClasses} grid shrink-0 place-items-center rounded-full border border-cyan/30 bg-cyan/10 font-black text-cyan`}
      aria-hidden="true"
    >
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

export async function Header() {
  let user = null;
  let profile: HeaderProfile | null = null;
  let unread = 0;
  let notifications: HeaderNotification[] = [];

  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;

    if (user) {
      const [{ data: profileData }, { count }, { data }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
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

      profile = profileData as HeaderProfile | null;
      unread = count ?? 0;
      notifications = (data ?? []) as HeaderNotification[];
    }
  } catch {
    user = null;
    profile = null;
  }

  const username = profile?.username?.trim() || null;
  const profileHref = username
    ? `/profiles/${encodeURIComponent(username)}`
    : "/dashboard/profile";
  const profileLabel = username
    ? `@${username}`
    : profile?.display_name?.trim() || "My profile";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/85 backdrop-blur-xl">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <BrandLogo priority className="shrink-0" />

        <nav className="hidden items-center gap-6 text-sm font-semibold text-soft lg:flex">
          <Link href="/discover" className="hover:text-white">
            Discover
          </Link>
          <Link href="/campaigns" className="hover:text-white">
            Campaigns
          </Link>
          <Link href="/wall-of-fame" className="hover:text-white">
            Wall of Fame
          </Link>
          {user && (
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
          )}
          <Link href="/help" className="hover:text-white">
            Help
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <NotificationPopover
                unread={unread}
                notifications={notifications}
              />

              <Link
                href={profileHref}
                className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.06]"
                aria-label="Open my public profile"
              >
                <ProfileAvatar profile={profile} />
                <span className="max-w-40 truncate text-sm font-semibold text-soft transition group-hover:text-white">
                  {profileLabel}
                </span>
              </Link>

              <form action={logout}>
                <button
                  type="submit"
                  className="btn-secondary !px-4 !py-2"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary !px-4 !py-2">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !px-4 !py-2">
                Join the Nexus
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {user && (
            <>
              <NotificationPopover
                unread={unread}
                notifications={notifications}
              />
              <Link
                href={profileHref}
                className="rounded-full transition hover:opacity-85"
                aria-label="Open my public profile"
              >
                <ProfileAvatar profile={profile} size="mobile" />
              </Link>
            </>
          )}
          <MobileMenu signedIn={Boolean(user)} unread={unread} />
        </div>
      </div>
    </header>
  );
}
