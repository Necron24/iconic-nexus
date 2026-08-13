"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, HelpCircle, LogOut, Menu, Newspaper, Trophy, X } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function MobileMenu({
  signedIn,
  unread
}: {
  signedIn: boolean;
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navClass = (href: string) => `rounded-xl border-l-2 px-4 py-3 transition ${pathname === href || pathname.startsWith(`${href}/`) ? "border-cyan bg-cyan/10 font-bold text-white" : "border-transparent hover:bg-white/5"}`;

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-white/10 p-2"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        type="button"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute left-0 top-20 w-full border-b border-white/10 bg-ink p-4 shadow-2xl">
          <nav className="container-page flex flex-col gap-2">
            <ThemeSwitcher mobile />
            <Link
              onClick={() => setOpen(false)}
              className={navClass("/discover")}
              href="/discover"
            >
              Discover
            </Link>

            <Link
              onClick={() => setOpen(false)}
              className={navClass("/devlogs")}
              href="/devlogs"
            >
              <span className="flex items-center gap-2"><Newspaper size={17} /> Devlogs</span>
            </Link>

            <Link
              onClick={() => setOpen(false)}
              className={navClass("/campaigns")}
              href="/campaigns"
            >
              Campaigns
            </Link>

            <Link
              onClick={() => setOpen(false)}
              className={navClass("/wall-of-fame")}
              href="/wall-of-fame"
            >
              <span className="flex items-center gap-2"><Trophy size={17} /> Wall of Fame</span>
            </Link>

            <Link
              onClick={() => setOpen(false)}
              className={`${navClass("/help")} flex items-center gap-2`}
              href="/help"
            >
              <HelpCircle size={17} />
              Help Centre
            </Link>

            {signedIn ? (
              <>
                <Link
                  onClick={() => setOpen(false)}
                  className={navClass("/dashboard")}
                  href="/dashboard"
                >
                  Dashboard
                </Link>

                <Link
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/5"
                  href="/dashboard/notifications"
                >
                  <span className="flex items-center gap-2">
                    <Bell size={17} />
                    Notifications
                  </span>

                  {unread > 0 && (
                    <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-black text-ink">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>

                <Link
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 hover:bg-white/5"
                  href="/dashboard/profile"
                >
                  Profile settings
                </Link>

                <div className="my-1 border-t border-white/10" />

                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left font-semibold text-red-200 transition hover:bg-red-400/10 hover:text-red-100"
                  >
                    <LogOut size={17} />
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 hover:bg-white/5"
                  href="/login"
                >
                  Log in
                </Link>

                <Link
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-2"
                  href="/register"
                >
                  Join the Nexus
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
