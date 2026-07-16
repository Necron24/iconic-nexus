import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FlaskConical,
  MessageSquareText,
  Pencil,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  stage: string;
  platform: string;
  is_published: boolean;
  icon_url: string | null;
};

type CampaignRow = {
  id: string;
  project_id: string;
  title: string;
  status: string;
};

export default async function DashboardProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error: queryError } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id,name,slug,type,stage,platform,is_published,icon_url")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const projectRows = (projects ?? []) as ProjectRow[];
  const projectIds = projectRows.map((project) => project.id);

  let campaigns: CampaignRow[] = [];
  let campaignsErrorMessage: string | null = null;

  if (projectIds.length > 0) {
    const { data: campaignData, error: campaignsError } = await supabase
      .from("testing_campaigns")
      .select("id,project_id,title,status")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      campaignsErrorMessage = campaignsError.message;
    } else {
      campaigns = (campaignData ?? []) as CampaignRow[];
    }
  }

  const visibleError =
    queryError ?? projectsError?.message ?? campaignsErrorMessage;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">My projects</h2>
          <p className="mt-1 text-soft">
            Create projects, manage campaigns and review feedback.
          </p>
        </div>

        <Link href="/dashboard/projects/new" className="btn-primary gap-2">
          <Plus size={18} />
          Add project
        </Link>
      </div>

      {success && (
        <div className="mb-4 rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">
          {success}
        </div>
      )}

      {visibleError && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          We could not load all project information: {visibleError}
        </div>
      )}

      {projectRows.length === 0 ? (
        <div className="card p-10 text-center">
          <h3 className="text-2xl font-black">No projects yet</h3>
          <Link href="/dashboard/projects/new" className="btn-primary mt-6">
            Add first project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projectRows.map((project) => {
            const projectCampaigns = campaigns.filter(
              (campaign) => campaign.project_id === project.id
            );
            const activeCampaigns = projectCampaigns.filter(
              (campaign) => campaign.status === "active"
            ).length;

            return (
              <article key={project.id} className="card p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    {project.icon_url ? (
                      <img
                        src={project.icon_url}
                        alt={`${project.name} icon`}
                        className="h-16 w-16 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-lime text-2xl font-black text-ink">
                        {project.name.charAt(0)}
                      </div>
                    )}

                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="badge">{project.type}</span>
                        <span className="badge">{project.platform}</span>
                        <span className="badge">{project.stage}</span>
                        <span className="badge">
                          {project.is_published ? "Published" : "Draft"}
                        </span>
                      </div>

                      <h3 className="text-xl font-black">{project.name}</h3>

                      <p className="mt-2 flex items-center gap-2 text-sm text-soft">
                        <Users size={15} />
                        {activeCampaigns} active campaign
                        {activeCampaigns === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/projects/${project.slug}`}
                      className="btn-secondary !px-4 !py-2"
                    >
                      View
                    </Link>

                    <Link
                      href={`/dashboard/projects/${project.id}/edit`}
                      className="btn-secondary !px-4 !py-2 gap-2"
                    >
                      <Pencil size={16} />
                      Edit
                    </Link>

                    <Link
                      href={`/dashboard/projects/${project.id}/campaigns/new`}
                      className="btn-primary !px-4 !py-2 gap-2"
                    >
                      <FlaskConical size={16} />
                      Create campaign
                    </Link>
                  </div>
                </div>

                {projectCampaigns.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="mb-3 text-sm font-bold text-soft">
                      Campaign management
                    </p>

                    <div className="space-y-2">
                      {projectCampaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold">{campaign.title}</p>
                            <p className="mt-1 text-xs text-soft">
                              Status: {campaign.status}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/dashboard/projects/${project.id}/campaigns/${campaign.id}/manage`}
                              className="btn-secondary !px-3 !py-2 gap-2"
                            >
                              <Settings2 size={15} />
                              Manage
                            </Link>

                            <Link
                              href={`/dashboard/projects/${project.id}/campaigns/${campaign.id}/feedback`}
                              className="btn-secondary !px-3 !py-2 gap-2"
                            >
                              <MessageSquareText size={15} />
                              Feedback
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}