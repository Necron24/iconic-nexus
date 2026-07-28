import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPlan } from "@/lib/subscriptions/current-plan";
import type { CreatorAnalytics } from "@/components/analytics/creator-analytics-dashboard";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function row(values: unknown[]) {
  return values.map(cell).join(",");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const plan = await getCurrentPlan(supabase, user.id);
  if (plan.plan_code !== "studio") {
    return NextResponse.json({ error: "CSV exports require the Studio plan." }, { status: 403 });
  }

  const requested = Number.parseInt(new URL(request.url).searchParams.get("days") ?? "30", 10);
  const days = [7, 30, 90, 365].includes(requested) ? requested : 30;
  const { data, error } = await supabase.rpc("get_creator_content_analytics", { p_days: days });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const analytics = data as CreatorAnalytics;
  const lines = [
    row(["Iconic Nexus Creator Analytics", `${days} days`]),
    "",
    row(["Metric", "Value"]),
    ...Object.entries(analytics.totals ?? {}).map(([label, value]) => row([label, value])),
    "",
    row(["Public profile"]),
    row(["Impressions", "Views", "Unique visitors", "External clicks", "Shares"]),
    row([analytics.profile?.impressions, analytics.profile?.views, analytics.profile?.unique_visitors, analytics.profile?.link_clicks, analytics.profile?.shares]),
    "",
    row(["Daily activity"]),
    row(["Day", "Impressions", "Views", "Engagements", "Campaign joins"]),
    ...(analytics.series ?? []).map((item) => row([item.day, item.impressions, item.views, item.engagements, item.conversions])),
    "",
    row(["Projects"]),
    row(["Project", "Impressions", "Views", "Unique visitors", "Link clicks", "Shares", "Engagements", "Campaign joins", "Archived"]),
    ...(analytics.projects ?? []).map((item) => row([item.name, item.impressions, item.views, item.unique_visitors, item.link_clicks, item.shares, item.engagements, item.conversions, Boolean(item.archived_at)])),
    "",
    row(["Devlogs"]),
    row(["Devlog", "Project", "Impressions", "Views", "Unique visitors", "Link clicks", "Shares", "Engagements", "Archived"]),
    ...(analytics.devlogs ?? []).map((item) => row([item.title, item.project_name, item.impressions, item.views, item.unique_visitors, item.link_clicks, item.shares, item.engagements, Boolean(item.archived_at)])),
    "",
    row(["Campaigns"]),
    row(["Campaign", "Project", "Status", "Private", "Impressions", "Views", "Unique visitors", "Link clicks", "Shares", "Joins", "Archived"]),
    ...(analytics.campaigns ?? []).map((item) => row([item.title, item.project_name, item.status, item.is_private, item.impressions, item.views, item.unique_visitors, item.link_clicks, item.shares, item.joins, Boolean(item.archived_at)])),
    "",
    row(["Traffic sources"]),
    row(["Source", "Events"]),
    ...(analytics.sources ?? []).map((item) => row([item.source, item.events]))
  ];

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="iconic-nexus-analytics-${days}d.csv"`,
      "cache-control": "private, no-store"
    }
  });
}
