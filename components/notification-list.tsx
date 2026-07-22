"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markNotificationRead } from "@/app/dashboard/notifications/actions";

type NotificationItem = { id: string; title: string; message: string; link_url: string | null; type: string; is_read: boolean; created_at: string };

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  const [items, setItems] = useState(notifications);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  function open(item: NotificationItem) {
    if (!item.is_read) {
      setItems(current => current.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      startTransition(async () => { await markNotificationRead(item.id); router.refresh(); });
    }
    if (item.link_url) router.push(item.link_url);
  }
  if (items.length === 0) return <div className="card p-10 text-center"><Bell className="mx-auto text-soft"/><h3 className="mt-4 text-2xl font-black">Nothing new yet</h3><p className="mt-2 text-soft">Important activity will appear here.</p></div>;
  return <div className="space-y-3">{items.map(n => <button type="button" disabled={isPending && !n.is_read} onClick={() => open(n)} key={n.id} className={`card block w-full p-5 text-left transition hover:bg-white/[0.06] ${n.is_read ? "opacity-70" : "border-lime/30 bg-lime/[0.04]"}`}><div className="flex items-start justify-between gap-4"><div><p className="font-black">{n.title}</p><p className="mt-2 text-sm leading-6 text-soft">{n.message}</p></div>{!n.is_read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-lime"/>}</div><p className="mt-3 text-xs text-soft">{new Date(n.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p></button>)}</div>;
}
