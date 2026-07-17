"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, HelpCircle, LogOut, Menu, X } from "lucide-react";
import { logout } from "@/app/auth/actions";

export function MobileMenu({
  signedIn,
  unread,
  email
}: {
  signedIn: boolean;
  unread: number;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <div className="flex items-center gap-2 lg:hidden">
      {signedIn && (
        <Link
          href="/dashboard/notifications"
          className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_10px_30px_rgba(0,0,0,.22)] backdrop-blur-xl"
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[10px] font-black text-ink">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_10px_30px_rgba(0,0,0,.22)] backdrop-blur-xl"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>

      {open && (
        <div className="absolute left-0 top-20 w-full border-b border-white/10 bg-ink/95 p-4 shadow-2xl backdrop-blur-2xl">
          <nav className="container-page mx-auto flex max-h-[calc(100vh-6rem)] flex-col gap-1 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.05] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            {email && <p className="truncate px-4 pb-2 pt-1 text-xs text-soft">{email}</p>}
            <Link onClick={close} className="rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/discover">Discover</Link>
            <Link onClick={close} className="rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/campaigns">Campaigns</Link>
            <Link onClick={close} className="rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/wall-of-fame">Wall of Fame</Link>
            {signedIn && <Link onClick={close} className="rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/dashboard">Dashboard</Link>}
            <Link onClick={close} className="flex items-center gap-2 rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/help"><HelpCircle size={17} />Help Centre</Link>

            {signedIn ? (
              <>
                <Link onClick={close} className="flex items-center justify-between rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/dashboard/notifications">
                  <span className="flex items-center gap-2"><Bell size={17} />Notifications</span>
                  {unread > 0 && <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-black text-ink">{unread}</span>}
                </Link>
                <Link onClick={close} className="rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/dashboard/profile">Profile settings</Link>
                <form action={logout} onSubmit={close}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left font-semibold text-red-100 hover:bg-red-400/10">
                    <LogOut size={17} />Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link onClick={close} className="rounded-2xl px-4 py-3 font-semibold hover:bg-white/[0.07]" href="/login">Log in</Link>
                <Link onClick={close} className="btn-primary mt-2" href="/register">Join the Nexus</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
