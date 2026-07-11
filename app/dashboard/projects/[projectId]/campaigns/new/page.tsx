import { notFound, redirect } from "next/navigation";
import { CampaignForm } from "@/components/campaign-form";
import { createCampaign } from "@/app/dashboard/campaigns/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewCampaignPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("id, owner_id, name").eq("id", projectId).maybeSingle(),
    supabase.from("profiles").select("credits").eq("id", user.id).single()
  ]);

  if (!project || project.owner_id !== user.id) notFound();

  const action = createCampaign.bind(null, project.id);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">New campaign</p>
        <h2 className="mt-2 text-3xl font-black">Find testers for {project.name}</h2>
        <p className="mt-2 text-soft">Campaign rewards are reserved from your Nexus Credits and paid only after you approve valid feedback.</p>
      </div>

      <CampaignForm
        action={action}
        projectName={project.name}
        cancelHref="/dashboard/projects"
        error={error}
        availableCredits={Number(profile?.credits ?? 0)}
      />
    </div>
  );
}
