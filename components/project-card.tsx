import Link from "next/link";
import { FlaskConical, ImageIcon, Star, UserRound, Users } from "lucide-react";

type Project = {
  id: string;
  slug: string;
  name: string;
  type: string;
  platform: string;
  stage: string;
  short_description: string;
  icon_url?: string | null;
  cover_url?: string | null;
  active_campaign_count?: number;
  active_campaign_id?: string | null;
  active_campaign_reward?: number | null;
  active_campaign_spots_left?: number | null;
  approved_test_count?: number;
  average_rating?: number | null;
  owner_id?: string | null;
  owner_username?: string | null;
  owner_display_name?: string | null;
  owner_avatar_url?: string | null;
};

export function ProjectCard({
  project,
  currentUserId
}: {
  project: Project;
  currentUserId?: string | null;
}) {
  const isOwnProject = Boolean(currentUserId && project.owner_id === currentUserId);
  const ownerName =
    project.owner_display_name?.trim() ||
    project.owner_username?.trim() ||
    "Iconic Nexus creator";

  const activeCampaignCount = Number(project.active_campaign_count ?? 0);
  const activeCampaignReward = Number(project.active_campaign_reward ?? 0);
  const activeCampaignSpotsLeft = Number(project.active_campaign_spots_left ?? 0);
  const hasActiveCampaign = activeCampaignCount > 0 && Boolean(project.active_campaign_id);

  const ownerBadge = isOwnProject ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/40 bg-lime/15 px-3 py-1.5 text-xs font-black text-lime shadow-lg backdrop-blur-md">
      <UserRound size={13} />
      My Project
    </span>
  ) : project.owner_username ? (
    <Link
      href={`/profiles/${encodeURIComponent(project.owner_username)}`}
      className="inline-flex max-w-[80%] items-center gap-2 rounded-full border border-white/15 bg-ink/80 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:border-cyan/50 hover:text-cyan"
      aria-label={`View ${ownerName}'s profile`}
    >
      {project.owner_avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.owner_avatar_url}
          alt=""
          className="h-5 w-5 rounded-full object-cover"
        />
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-black">
          {ownerName.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate">@{project.owner_username}</span>
    </Link>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink/80 px-3 py-1.5 text-xs font-bold text-white/80 shadow-lg backdrop-blur-md">
      <UserRound size={13} />
      {ownerName}
    </span>
  );

  const campaignBadgeText =
    activeCampaignCount > 1
      ? `${activeCampaignCount} active campaigns`
      : `Testing · ${activeCampaignReward} credit${activeCampaignReward === 1 ? "" : "s"}`;

  return (
    <article className="card overflow-hidden">
      <div className="relative grid h-40 place-items-center overflow-hidden bg-white/5">
        {project.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="text-white/20" size={38} />
        )}

        {(isOwnProject || project.owner_username || project.owner_display_name) && (
          <div className="absolute left-3 top-3 max-w-[58%]">{ownerBadge}</div>
        )}

        {hasActiveCampaign && (
          <Link
            href={`/campaigns/${project.active_campaign_id}`}
            className="absolute right-3 top-3 inline-flex max-w-[58%] flex-col items-end rounded-xl border border-cyan/40 bg-ink/85 px-3 py-2 text-right shadow-lg backdrop-blur-md transition hover:border-lime/60 hover:bg-ink"
            aria-label={`Open active testing campaign for ${project.name}`}
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-cyan">
              <FlaskConical size={13} />
              {campaignBadgeText}
            </span>
            <span className="mt-0.5 text-[10px] font-bold text-white/75">
              {activeCampaignSpotsLeft} spot{activeCampaignSpotsLeft === 1 ? "" : "s"} left
            </span>
          </Link>
        )}
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-start gap-3">
          {project.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.icon_url}
              alt={`${project.name} icon`}
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lime font-black text-ink">
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black">{project.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge">{project.type}</span>
              <span className="badge">{project.platform}</span>
              <span className="badge">{project.stage}</span>
            </div>
          </div>
        </div>

        <p className="mb-4 min-h-12 text-sm leading-6 text-soft">
          {project.short_description}
        </p>

        <div className="mb-5 flex flex-wrap gap-3 text-xs text-soft">
          <span className="flex items-center gap-1.5">
            <FlaskConical size={14} /> {activeCampaignCount} active
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={14} /> {project.approved_test_count ?? 0} tests
          </span>
          <span className="flex items-center gap-1.5">
            <Star size={14} />
            {project.average_rating
              ? Number(project.average_rating).toFixed(1)
              : "New"}
          </span>
        </div>

        <Link href={`/projects/${project.slug}`} className="btn-secondary w-full">
          View project
        </Link>
      </div>
    </article>
  );
}
