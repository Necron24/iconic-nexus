import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPlan } from "@/lib/subscriptions/current-plan";
import {
  CreatorAnalyticsDashboard,
  type CreatorAnalytics
} from "@/components/analytics/creator-analytics-dashboard";

const EMPTY_ANALYTICS: CreatorAnalytics = {
  days: 30,
  totals: {
    impressions: 0,
    views: 0,
    unique_visitors: 0,
    link_clicks: 0,
    shares: 0,
    saves: 0,
    follows: 0,
    reactions: 0,
    comments: 0,
    campaign_joins: 0
  },
  series: [],
  projects: [],
  devlogs: [],
  sources: [],
  funnel: { impressions: 0, views: 0, link_clicks: 0, campaign_joins: 0 }
};

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: requestedValue } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const plan = await getCurrentPlan(supabase, user.id);
  const allowedRanges = plan.plan_code === "studio"
    ? [7, 30, 90, 365]
    : plan.plan_code === "pro"
      ? [7, 30, 90]
      : [7, 30];
  const requested = Number.parseInt(String(requestedValue ?? "30"), 10);
  const selectedDays = allowedRanges.includes(requested) ? requested : Math.max(...allowedRanges);

  const [{ data: analyticsData, error }, { data: legacyRows }] = await Promise.all([
    supabase.rpc("get_creator_content_analytics", { p_days: selectedDays }),
    supabase.rpc("get_developer_analytics")
  ]);
  const legacy = Array.isArray(legacyRows) ? legacyRows[0] ?? {} : legacyRows ?? {};

  if (error) {
    return (
      <div className="space-y-5">
        <div><p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Creator analytics</p><h2 className="mt-2 text-3xl font-black">Analytics setup required</h2></div>
        <div className="card p-6 text-red-200">{error.message}</div>
        <p className="text-sm text-soft">Run the creator analytics Supabase update, then reload this page.</p>
      </div>
    );
  }

  const analytics = {
    ...EMPTY_ANALYTICS,
    ...(analyticsData as Partial<CreatorAnalytics> | null),
    days: selectedDays
  } as CreatorAnalytics;

  return (
    <CreatorAnalyticsDashboard
      analytics={analytics}
      legacy={legacy}
      planName={plan.plan_name}
      planCode={plan.plan_code}
      selectedDays={selectedDays}
      allowedRanges={allowedRanges}
    />
  );
}
