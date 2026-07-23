import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  FileText,
  MonitorSmartphone,
  ShieldCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function TestSessionDetailsPage({
  params
}: {
  params: Promise<{ membershipId: string; sessionId: string }>;
}) {
  const { membershipId, sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("test_sessions")
    .select(
      "id,campaign_member_id,minutes_tested,device_name,os_version,notes,created_at,campaign_members!inner(id,tester_id,status,testing_campaigns!inner(id,title,minimum_minutes,projects!inner(id,name,slug,owner_id)))"
    )
    .eq("id", sessionId)
    .eq("campaign_member_id", membershipId)
    .maybeSingle();

  if (!session) notFound();

  const membership = Array.isArray(session.campaign_members)
    ? session.campaign_members[0]
    : session.campaign_members;
  if (!membership) notFound();

  const campaign = Array.isArray(membership.testing_campaigns)
    ? membership.testing_campaigns[0]
    : membership.testing_campaigns;
  if (!campaign) notFound();

  const project = Array.isArray(campaign.projects)
    ? campaign.projects[0]
    : campaign.projects;
  if (!project) notFound();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isTester = membership.tester_id === user.id;
  const isOwner = project.owner_id === user.id;
  const isAdmin = viewerProfile?.is_admin === true;

  if (!isTester && !isOwner && !isAdmin) notFound();

  const loggedAt = new Date(session.created_at);
  const meetsMinimum = session.minutes_tested >= campaign.minimum_minutes;
  const backHref = isTester
    ? `/dashboard/testing/${membershipId}`
    : `/dashboard/projects/${project.id}/campaigns/${campaign.id}/feedback`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={backHref} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan hover:underline">
        <ArrowLeft size={17} />
        Back
      </Link>

      <div className="card overflow-hidden">
        <div className="border-b border-white/10 p-6 md:p-8">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Test session details</p>
          <h1 className="mt-2 text-3xl font-black">{project.name}</h1>
          <p className="mt-2 text-soft">{campaign.title}</p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 md:p-8">
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-soft">
              <MonitorSmartphone size={17} /> Device
            </p>
            <p className="mt-3 text-lg font-black">{session.device_name || "Not provided"}</p>
            <p className="mt-1 text-sm text-soft">{session.os_version || "OS version not provided"}</p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-soft">
              <Clock3 size={17} /> Duration
            </p>
            <p className="mt-3 text-lg font-black text-cyan">{session.minutes_tested} minutes</p>
            <p className="mt-1 text-sm text-soft">Campaign minimum: {campaign.minimum_minutes} minutes</p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-soft">
              <CalendarClock size={17} /> Logged at
            </p>
            <p className="mt-3 text-lg font-black">{loggedAt.toLocaleDateString("en-ZA")}</p>
            <p className="mt-1 text-sm text-soft">{loggedAt.toLocaleTimeString("en-ZA")}</p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-soft">
              <ShieldCheck size={17} /> Requirement check
            </p>
            <p className={`mt-3 text-lg font-black ${meetsMinimum ? "text-lime" : "text-amber-100"}`}>
              {meetsMinimum ? "Minimum met in this session" : "Below the campaign minimum"}
            </p>
            <p className="mt-1 text-sm capitalize text-soft">Membership status: {membership.status.replaceAll("_", " ")}</p>
          </div>
        </div>

        <div className="border-t border-white/10 p-6 md:p-8">
          <p className="flex items-center gap-2 font-black">
            <FileText size={18} /> Session notes
          </p>
          <div className="mt-4 min-h-28 rounded-2xl bg-white/[0.04] p-5">
            <p className="whitespace-pre-wrap leading-7 text-soft">
              {session.notes?.trim() || "No notes were supplied for this session."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
