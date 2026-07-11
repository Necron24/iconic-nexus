import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase.from("notifications")
    .select("id, title, message, link_url, type, is_read, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-black">Notifications</h2><p className="mt-1 text-soft">Campaign joins, feedback and credit updates.</p></div>
        <form action={markAllNotificationsRead}><button className="btn-secondary gap-2"><CheckCheck size={17} /> Mark all read</button></form>
      </div>

      {(notifications ?? []).length === 0 ? (
        <div className="card p-10 text-center"><Bell className="mx-auto text-soft" /><h3 className="mt-4 text-2xl font-black">Nothing new yet</h3><p className="mt-2 text-soft">Important activity will appear here.</p></div>
      ) : (
        <div className="space-y-3">
          {(notifications ?? []).map(n => {
            const content = <div className={`card p-5 ${n.is_read ? "opacity-70" : "border-lime/30 bg-lime/[0.04]"}`}>
              <div className="flex items-start justify-between gap-4"><div><p className="font-black">{n.title}</p><p className="mt-2 text-sm leading-6 text-soft">{n.message}</p></div>{!n.is_read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-lime" />}</div>
              <p className="mt-3 text-xs text-soft">{new Date(n.created_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>;
            return n.link_url ? <Link key={n.id} href={n.link_url}>{content}</Link> : <div key={n.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
