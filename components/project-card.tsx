import Link from "next/link";
import { ImageIcon } from "lucide-react";

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
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card overflow-hidden">
      <div className="relative grid h-40 place-items-center overflow-hidden bg-white/5">
        {project.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="text-white/20" size={38} />
        )}
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-start gap-3">
          {project.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.icon_url} alt={`${project.name} icon`} className="h-12 w-12 rounded-xl object-cover" />
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

        <p className="mb-5 min-h-12 text-sm leading-6 text-soft">{project.short_description}</p>

        <Link href={`/projects/${project.slug}`} className="btn-secondary w-full">
          View project
        </Link>
      </div>
    </article>
  );
}
