import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FlaskConical,
  MessageSquareText,
  Pencil,
  Plus,
  Settings2,
  Users
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardProjectsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id,name,slug,type,stage,platform,is_published,icon_url,testing_campaigns(id,title,status,campaign_members(id,status))"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

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

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {(projects ?? []).length === 0 ? (
        <div className="card p-10 text-center">
          <h3 className="text-2xl font-black">No projects yet</h3>
          <Link href="/dashboard/projects/new" className="btn-primary mt-6">
            Add first project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(projects ?? []).map((project) => {
            const campaigns = project.testing_campaigns ?? [];
            const activeCampaigns = campaigns.filter(
              (campaign) => campaign.status === "active"
            ).length;

            return (
              <article key={project.id} className="card p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    {project.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
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

                        <span
                          className={
                            project.is_published
                              ? "badge border-lime/30 bg-lime/10 text-lime"
                              : "badge border-amber-300/30 bg-amber-300/10 text-amber-100"
                          }
                        >
                          {project.is_published ? "Published" : "Unpublished"}
                        </span>
                      </div>

                      <h3 className="text-xl font-black">{project.name}</h3>

                      <p className="mt-2 flex items-center gap-2 text-sm text-soft">
                        <Users size={15} />
                        {activeCampaigns} active campaigns
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

                {campaigns.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="mb-3 text-sm font-bold text-soft">
                      Campaign management
                    </p>

                    <div className="space-y-2">
                      {campaigns.map((campaign) => {
                        const submitted = (
                          campaign.campaign_members ?? []
                        ).filter(
                          (membership) => membership.status === "submitted"
                        ).length;

                        return (
                          <div
                            key={campaign.id}
                            className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold">{campaign.title}</p>
                              <p className="mt-1 text-xs text-soft">
                                Status: {campaign.status}
                                {submitted > 0
                                  ? ` · ${submitted} awaiting review`
                                  : ""}
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
                        );
                      })}
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