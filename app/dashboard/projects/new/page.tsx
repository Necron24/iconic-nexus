import Link from "next/link";
import { ProjectForm } from "@/components/project-form";
import { createProject } from "../actions";

export default async function NewProjectPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/projects" className="text-sm font-bold text-cyan hover:text-white">
          ← Back to my projects
        </Link>
        <h2 className="mt-3 text-3xl font-black">Add a project</h2>
        <p className="mt-2 text-soft">Create a listing and upload the real images for your app or game.</p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <ProjectForm action={createProject} submitLabel="Create project" cancelHref="/dashboard/projects" />
    </div>
  );
}
