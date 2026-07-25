import { createClient } from "@/lib/supabase/server";

export type CurrentPlan = {
  plan_code: string;
  plan_name: string;
  private_campaigns: boolean;
  advanced_analytics: boolean;
  active_campaign_limit: number;
  team_member_limit: number;
};

const FREE_PLAN: CurrentPlan = {
  plan_code: "free",
  plan_name: "Free",
  private_campaigns: false,
  advanced_analytics: false,
  active_campaign_limit: 1,
  team_member_limit: 1
};

export async function getCurrentPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  timeoutMs = 3000
): Promise<CurrentPlan> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data, error } = await supabase
      .rpc("current_plan", { p_profile_id: profileId })
      .abortSignal(controller.signal);

    if (error) return FREE_PLAN;
    const plan = Array.isArray(data) ? data[0] : data;
    if (!plan) return FREE_PLAN;

    return {
      ...FREE_PLAN,
      ...plan,
      private_campaigns: Boolean(plan.private_campaigns),
      advanced_analytics: Boolean(plan.advanced_analytics)
    };
  } catch {
    return FREE_PLAN;
  } finally {
    clearTimeout(timeout);
  }
}
