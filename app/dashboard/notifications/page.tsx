import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCheck, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { clearReadNotifications, markAllNotificationsRead, updateNotificationPreferences } from "./actions";
import { NotificationList } from "@/components/notification-list";

const categories = ["all", "following", "community", "testing", "credits"] as const;

export default async function NotificationsPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; unread?: string }>;
}) {
  const params = await searchParams;
  const category = categories.includes(params.category as typeof categories[number]) ? params.category! : "all";
  const unreadOnly = params.unread === "1";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let notificationQuery = supabase.from("notifications")
    .select("id,title,message,link_url,type,is_read,created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false }).limit(100);
  if (unreadOnly) notificationQuery = notificationQuery.eq("is_read", false);
  if (category === "following") notificationQuery = notificationQuery.in("type", ["creator_project", "devlog_published", "campaign_available", "campaign_watch"]);
  if (category === "community") notificationQuery = notificationQuery.in("type", ["devlog_comment", "devlog_reply"]);
  if (category === "testing") notificationQuery = notificationQuery.in("type", ["campaign_join", "feedback_approved", "changes_requested", "invalid_test_reported", "invalid_test_resolved"]);
  if (category === "credits") notificationQuery = notificationQuery.in("type", ["credit_update", "feedback_approved", "campaign_refund", "reward_paid"]);

  const [{ data: notifications }, { data: preferences }] = await Promise.all([
    notificationQuery,
    supabase.from("notification_preferences").select("*").eq("profile_id", user.id).maybeSingle()
  ]);
  const preference = {
    creator_updates: preferences?.creator_updates ?? true,
    project_updates: preferences?.project_updates ?? true,
    campaign_updates: preferences?.campaign_updates ?? true,
    community_replies: preferences?.community_replies ?? true,
    testing_updates: preferences?.testing_updates ?? true,
    credit_updates: preferences?.credit_updates ?? true
  };
  const href = (nextCategory: string, unread = unreadOnly) => `/dashboard/notifications?category=${nextCategory}${unread ? "&unread=1" : ""}`;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-2xl font-black">Notifications</h2><p className="mt-1 text-soft">Updates from creators, projects, campaigns and your testing activity.</p></div>
      <div className="flex flex-wrap gap-2"><form action={markAllNotificationsRead}><button className="btn-secondary gap-2"><CheckCheck size={17}/>Mark all read</button></form><form action={clearReadNotifications}><button className="btn-secondary text-red-200">Clear read</button></form></div>
    </div>

    <nav className="flex flex-wrap gap-2">
      {categories.map((item) => <Link key={item} href={href(item)} className={category === item ? "btn-primary !px-4 !py-2 capitalize" : "btn-secondary !px-4 !py-2 capitalize"}>{item}</Link>)}
      <Link href={href(category, !unreadOnly)} className={unreadOnly ? "btn-primary !px-4 !py-2" : "btn-secondary !px-4 !py-2"}>{unreadOnly ? "Showing unread" : "Unread only"}</Link>
    </nav>

    <NotificationList notifications={notifications ?? []}/>

    <details className="card group p-5">
      <summary className="flex cursor-pointer list-none items-center gap-3 font-black"><SlidersHorizontal className="text-cyan" size={20}/>Notification preferences</summary>
      <form action={updateNotificationPreferences} className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["creatorUpdates", "Creator updates", preference.creator_updates],
          ["projectUpdates", "Project devlogs and releases", preference.project_updates],
          ["campaignUpdates", "Campaign and watch updates", preference.campaign_updates],
          ["communityReplies", "Comments and replies", preference.community_replies],
          ["testingUpdates", "My testing progress", preference.testing_updates],
          ["creditUpdates", "Credits and rewards", preference.credit_updates]
        ].map(([name, label, checked]) => <label key={String(name)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="h-4 w-4 accent-lime"/><span className="font-semibold">{String(label)}</span></label>)}
        <button className="btn-primary sm:col-span-2"><BellRing size={17}/>Save notification preferences</button>
      </form>
    </details>
  </div>;
}
