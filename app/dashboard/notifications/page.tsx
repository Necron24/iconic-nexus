import { redirect } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "./actions";
import { NotificationList } from "@/components/notification-list";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: notifications } = await supabase.from("notifications").select("id,title,message,link_url,type,is_read,created_at").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(100);
  return <div><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black">Notifications</h2><p className="mt-1 text-soft">Campaign joins, feedback and credit updates.</p></div><form action={markAllNotificationsRead}><button className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold transition hover:bg-white/10"><CheckCheck size={17}/> Mark all read</button></form></div><NotificationList notifications={notifications ?? []}/></div>;
}
