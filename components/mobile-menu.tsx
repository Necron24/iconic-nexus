"use client";
import Link from "next/link";
import { useState } from "react";
import { Bell, HelpCircle, Menu, X } from "lucide-react";

export function MobileMenu({ signedIn, unread }: { signedIn: boolean; unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button onClick={() => setOpen(!open)} className="rounded-lg border border-white/10 p-2" aria-label="Open menu">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute left-0 top-20 w-full border-b border-white/10 bg-ink p-4 shadow-2xl">
          <nav className="container-page flex flex-col gap-2">
            <Link onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-white/5" href="/discover">Discover</Link>
            <Link onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-white/5" href="/campaigns">Campaigns</Link>
            {signedIn ? (
              <>
                <Link onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-white/5" href="/dashboard">Dashboard</Link>
                <Link onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 hover:bg-white/5" href="/help"><HelpCircle size={17} />Help Centre</Link>
                <Link onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/5" href="/dashboard/notifications"><span className="flex items-center gap-2"><Bell size={17} />Notifications</span>{unread > 0 && <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-black text-ink">{unread}</span>}</Link>
                <Link onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-white/5" href="/dashboard/profile">Profile settings</Link>
              </>
            ) : (
              <>
                <Link onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 hover:bg-white/5" href="/help"><HelpCircle size={17} />Help Centre</Link>
                <Link onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-white/5" href="/login">Log in</Link>
                <Link onClick={() => setOpen(false)} className="btn-primary mt-2" href="/register">Join the Nexus</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
