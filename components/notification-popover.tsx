"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsRead } from "@/app/dashboard/notifications/actions";

export type HeaderNotification = {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationPopover({
  unread,
  notifications,
}: {
  unread: number;
  notifications: HeaderNotification[];
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] shadow-[0_12px_35px_rgba(0,0,0,.22)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10"
        aria-label="Open notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[10px] font-black text-ink ring-2 ring-ink">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+12px)] z-[80] w-[min(92vw,390px)] overflow-hidden rounded-[24px] border border-white/15 bg-[#101827]/95 shadow-[0_28px_90px_rgba(0,0,0,.48)] backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <div>
              <p className="font-black text-white">Notifications</p>
              <p className="mt-0.5 text-xs text-soft">
                {unread > 0 ? `${unread} unread` : "You are all caught up"}
              </p>
            </div>
            {unread > 0 && (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-soft transition hover:bg-white/10 hover:text-white"
                >
                  <CheckCheck size={15} />
                  Mark read
                </button>
              </form>
            )}
          </div>

          <div className="max-h-[min(62vh,470px)] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto text-soft" size={24} />
                <p className="mt-3 font-bold">Nothing new yet</p>
                <p className="mt-1 text-sm text-soft">Important activity will appear here.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => {
                  const item = (
                    <div
                      className={`rounded-2xl px-4 py-3 transition hover:bg-white/[0.07] ${
                        notification.is_read ? "opacity-75" : "bg-lime/[0.045]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            notification.is_read ? "bg-white/20" : "bg-lime"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{notification.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-soft">{notification.message}</p>
                          <p className="mt-2 text-[11px] text-soft/80">
                            {new Date(notification.created_at).toLocaleString("en-ZA", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );

                  return notification.link_url ? (
                    <Link key={notification.id} href={notification.link_url} onClick={() => setOpen(false)}>
                      {item}
                    </Link>
                  ) : (
                    <div key={notification.id}>{item}</div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-xl bg-white/5 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
