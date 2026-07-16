import Link from "next/link";
import { CampaignFeed, type BrowseCampaign } from "@/components/campaigns/campaign-feed";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("browse_campaigns", {
    p_search: null,
    p_platform: null,
    p_stage: null,
    p_sort: "newest",
    p_limit: 10,
    p_offset: 0
  });

  const campaigns = ((data ?? []) as BrowseCampaign[]).map((campaign) => ({
    ...campaign,
    joined_count: Number(campaign.joined_count ?? 0)
  }));

  return (
    <section className="container-page py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Testing campaigns</p>
          <h1 className="mt-2 text-4xl font-black">Join an active test</h1>
          <p className="mt-3 text-soft">Find relevant tests quickly and keep scrolling as new campaigns load.</p>
        </div>
        <Link href="/dashboard/projects" className="btn-primary">Create campaign</Link>
      </div>
      {error && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">Initial campaigns could not be loaded: {error.message}</div>}
      <CampaignFeed initialCampaigns={campaigns} />
    </section>
  );
}
