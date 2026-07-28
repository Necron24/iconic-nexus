import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, BarChart3, FolderKanban, Newspaper, Search, TestTube2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ContentManagementActions } from "@/components/content-management-actions";
import { archiveContent, deleteContent, restoreContent, type ManagedContentType } from "./actions";
import { CampaignStatusBadge, PlatformBadges, ProjectTypeBadge, StageBadge } from "@/components/project-meta";

type ContentRow = {
  id: string;
  type: ManagedContentType;
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
  archivedAt: string | null;
  viewHref: string;
  editHref: string;
  platform: string;
  stage: string;
  projectType?: string;
};

const typeOptions = ["all", "project", "devlog", "campaign"] as const;
const statusOptions = ["active", "archived", "all"] as const;
const sortOptions = ["newest", "oldest", "name", "status"] as const;

export default async function ContentManagerPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string; status?: string; sort?: string; q?: string; success?: string; error?: string }>;
}) {
  const query = await searchParams;
  const type = typeOptions.includes(query.type as typeof typeOptions[number]) ? query.type! : "all";
  const status = statusOptions.includes(query.status as typeof statusOptions[number]) ? query.status! : "active";
  const sort = sortOptions.includes(query.sort as typeof sortOptions[number]) ? query.sort! : "newest";
  const search = String(query.q ?? "").trim().toLowerCase().slice(0, 80);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: projects }, { data: devlogs }, { data: campaigns }] = await Promise.all([
    supabase.from("projects")
      .select("id,name,slug,type,stage,platform,is_published,created_at,archived_at")
      .eq("owner_id", user.id),
    supabase.from("project_updates")
      .select("id,project_id,title,update_type,is_published,created_at,archived_at,projects!inner(id,name,owner_id,platform,stage,type)")
      .eq("projects.owner_id", user.id),
    supabase.from("testing_campaigns")
      .select("id,project_id,title,status,is_private,created_at,archived_at,projects!inner(id,name,owner_id,platform,stage,type)")
      .eq("projects.owner_id", user.id)
  ]);

  const rows: ContentRow[] = [
    ...(projects ?? []).map((project) => ({
      id: project.id,
      type: "project" as const,
      title: project.name,
      subtitle: `${project.type} · ${project.stage}`,
      status: project.is_published ? "Published" : "Draft",
      createdAt: project.created_at,
      archivedAt: project.archived_at,
      viewHref: `/projects/${project.slug}`,
      editHref: `/dashboard/projects/${project.id}/edit`,
      platform: project.platform,
      stage: project.stage,
      projectType: project.type
    })),
    ...(devlogs ?? []).map((devlog) => {
      const project = Array.isArray(devlog.projects) ? devlog.projects[0] : devlog.projects;
      return {
        id: devlog.id,
        type: "devlog" as const,
        title: devlog.title,
        subtitle: `${project?.name ?? "Project"} · ${devlog.update_type.replaceAll("_", " ")}`,
        status: devlog.is_published ? "Published" : "Draft",
        createdAt: devlog.created_at,
        archivedAt: devlog.archived_at,
        viewHref: `/devlogs/${devlog.id}`,
        editHref: `/dashboard/projects/${devlog.project_id}/updates/${devlog.id}/edit`,
        platform: project?.platform ?? "Other",
        stage: project?.stage ?? "prototype",
        projectType: project?.type
      };
    }),
    ...(campaigns ?? []).map((campaign) => {
      const project = Array.isArray(campaign.projects) ? campaign.projects[0] : campaign.projects;
      return {
        id: campaign.id,
        type: "campaign" as const,
        title: campaign.title,
        subtitle: `${project?.name ?? "Project"} · ${campaign.is_private ? "Private" : "Public"}`,
        status: campaign.status.replaceAll("_", " "),
        createdAt: campaign.created_at,
        archivedAt: campaign.archived_at,
        viewHref: `/campaigns/${campaign.id}`,
        editHref: `/dashboard/projects/${campaign.project_id}/campaigns/${campaign.id}/manage`,
        platform: project?.platform ?? "Other",
        stage: project?.stage ?? "prototype",
        projectType: project?.type
      };
    })
  ];

  const filtered = rows
    .filter((row) => type === "all" || row.type === type)
    .filter((row) => status === "all" || (status === "archived" ? Boolean(row.archivedAt) : !row.archivedAt))
    .filter((row) => !search || `${row.title} ${row.subtitle} ${row.status}`.toLowerCase().includes(search))
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "status") return a.status.localeCompare(b.status) || a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const counts = {
    active: rows.filter((row) => !row.archivedAt).length,
    archived: rows.filter((row) => row.archivedAt).length,
    projects: rows.filter((row) => row.type === "project").length,
    devlogs: rows.filter((row) => row.type === "devlog").length,
    campaigns: rows.filter((row) => row.type === "campaign").length
  };
  const iconFor = (contentType: ManagedContentType) =>
    contentType === "project" ? FolderKanban : contentType === "devlog" ? Newspaper : TestTube2;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Content manager</p>
          <h2 className="mt-2 text-3xl font-black">Organise your listings</h2>
          <p className="mt-2 text-soft">Archive content to hide it without losing data. Permanent deletion is protected by safety checks.</p>
        </div>
        <Link href="/dashboard/analytics" className="btn-secondary gap-2"><BarChart3 size={17} />View analytics</Link>
      </div>

      {query.success && <div className="rounded-xl border border-lime/30 bg-lime/10 p-4 text-sm text-lime">{query.success}</div>}
      {query.error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{query.error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Active", counts.active],
          ["Archived", counts.archived],
          ["Projects", counts.projects],
          ["Devlogs", counts.devlogs],
          ["Campaigns", counts.campaigns]
        ].map(([label, value]) => <div key={String(label)} className="card p-4"><p className="text-xs text-soft">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]" action="/dashboard/content">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-soft" size={17} />
          <input name="q" defaultValue={query.q ?? ""} className="field !pl-10" placeholder="Search your content" />
        </label>
        <select name="type" defaultValue={type} className="field">
          <option value="all">All content</option><option value="project">Projects</option><option value="devlog">Devlogs</option><option value="campaign">Campaigns</option>
        </select>
        <select name="status" defaultValue={status} className="field">
          <option value="active">Active only</option><option value="archived">Archived only</option><option value="all">All statuses</option>
        </select>
        <select name="sort" defaultValue={sort} className="field">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option><option value="status">Status</option>
        </select>
        <button className="btn-primary md:col-start-4">Apply filters</button>
      </form>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center"><Archive className="mx-auto text-cyan" size={36} /><h3 className="mt-4 text-xl font-black">No matching content</h3><p className="mt-2 text-soft">Change the filters or create new content.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const Icon = iconFor(row.type);
            return (
              <article key={`${row.type}-${row.id}`} className={`card p-5 ${row.archivedAt ? "opacity-75" : ""}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan/10 text-cyan"><Icon size={20} /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">{row.projectType && <ProjectTypeBadge type={row.projectType} compact />}<PlatformBadges platform={row.platform} compact /><StageBadge stage={row.stage} compact />{row.type === "campaign" ? <CampaignStatusBadge status={row.status} /> : <span className="badge capitalize">{row.type} · {row.status}</span>}{row.archivedAt && <span className="badge border-amber-300/30 bg-amber-300/10 text-amber-100">Archived</span>}</div>
                      <h3 className="mt-2 truncate text-lg font-black">{row.title}</h3>
                      <p className="mt-1 text-sm text-soft">{row.subtitle} · Created {new Date(row.createdAt).toLocaleDateString("en-ZA")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!row.archivedAt && <Link href={row.viewHref} className="btn-secondary !px-3 !py-2">View</Link>}
                    <Link href={row.editHref} className="btn-secondary !px-3 !py-2">Manage</Link>
                    <ContentManagementActions
                      contentType={row.type}
                      contentId={row.id}
                      archived={Boolean(row.archivedAt)}
                      archiveAction={archiveContent}
                      restoreAction={restoreContent}
                      deleteAction={deleteContent}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
