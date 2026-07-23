import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  FileText,
  MonitorSmartphone,
  ShieldAlert,
  UserRound
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  id: string;
  minutes_tested: number;
  device_name: string | null;
  os_version: string | null;
  notes: string | null;
  created_at: string;
};

type InvalidTestCase = {
  id: string;
  status: string;
  category: string;
  reason: string;
  resolution_note: string | null;
  created_at: string;
  campaign_member_id: string;
  tester_username: string | null;
  tester_display_name: string | null;
  developer_username: string | null;
  developer_display_name: string | null;
  project_name: string;
  campaign_title: string;
  campaign_instructions: string | null;
  minimum_minutes: number;
  reward_credits: number;
  membership_status: string;
  what_worked: string | null;
  what_was_confusing: string | null;
  bug_details: string | null;
  overall_rating: number | null;
  performance_rating: number | null;
  stability_rating: number | null;
  ease_of_use_rating: number | null;
  sessions: SessionRow[];
};

export default async function AdminInvalidTestRecordPage({
  params
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/dashboard");

  const { data, error } = await supabase.rpc("admin_get_invalid_test_case", {
    p_report_id: reportId
  });

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/admin/reports"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan hover:underline"
        >
          <ArrowLeft size={17} />
          Back to Safety and moderation
        </Link>
        <div className="card border border-red-400/30 p-6">
          <h1 className="text-2xl font-black text-red-200">Test record could not be loaded</h1>
          <p className="mt-3 text-soft">
            The admin database function returned an error instead of hiding the problem behind a 404.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-sm text-red-100">
            {error.message}
          </pre>
          <p className="mt-4 text-xs text-soft">Report ID: {reportId}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/admin/reports"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan hover:underline"
        >
          <ArrowLeft size={17} />
          Back to Safety and moderation
        </Link>
        <div className="card p-6">
          <h1 className="text-2xl font-black">Invalid-test report not found</h1>
          <p className="mt-3 text-soft">
            The route exists, but no invalid-test report with this ID could be found.
          </p>
          <p className="mt-4 text-xs text-soft">Report ID: {reportId}</p>
        </div>
      </div>
    );
  }

  const record = data as InvalidTestCase;
  const sessions = Array.isArray(record.sessions) ? record.sessions : [];
  const totalMinutes = sessions.reduce(
    (sum, session) => sum + Number(session.minutes_tested || 0),
    0
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard/admin/reports"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-cyan hover:underline"
      >
        <ArrowLeft size={17} />
        Back to Safety and moderation
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">
            Invalid-test review record
          </p>
          <h1 className="mt-2 text-3xl font-black">{record.project_name}</h1>
          <p className="mt-2 text-soft">{record.campaign_title}</p>
        </div>
        <span className="badge capitalize">{record.status.replaceAll("_", " ")}</span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-soft">Tester</p>
          <p className="mt-2 font-black">
            {record.tester_display_name || record.tester_username || "Unknown"}
          </p>
          {record.tester_username && (
            <p className="mt-1 text-sm text-cyan">@{record.tester_username}</p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm text-soft">Developer</p>
          <p className="mt-2 font-black">
            {record.developer_display_name || record.developer_username || "Unknown"}
          </p>
          {record.developer_username && (
            <p className="mt-1 text-sm text-cyan">@{record.developer_username}</p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-sm text-soft">Logged testing</p>
          <p className="mt-2 text-2xl font-black text-cyan">
            {totalMinutes}/{record.minimum_minutes} min
          </p>
          <p className="mt-1 text-sm text-soft">{sessions.length} sessions</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-soft">Reserved reward</p>
          <p className="mt-2 text-2xl font-black text-lime">{record.reward_credits}</p>
          <p className="mt-1 text-sm capitalize text-soft">
            {record.membership_status.replaceAll("_", " ")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-xl font-black text-red-200">
            <ShieldAlert size={20} /> Developer invalid-test report
          </h2>
          <p className="mt-4 text-sm font-bold capitalize text-white">
            {record.category.replaceAll("_", " ")}
          </p>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-soft">{record.reason}</p>
          <p className="mt-4 text-xs text-soft">
            Submitted {new Date(record.created_at).toLocaleString("en-ZA")}
          </p>
        </section>

        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-xl font-black text-cyan">
            <FileText size={20} /> Campaign requirements
          </h2>
          <p className="mt-4 whitespace-pre-wrap leading-7 text-soft">
            {record.campaign_instructions || "No campaign instructions were stored."}
          </p>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="text-xl font-black">Submitted feedback</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Overall", record.overall_rating],
            ["Performance", record.performance_rating],
            ["Stability", record.stability_rating],
            ["Ease of use", record.ease_of_use_rating]
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white/[0.04] p-4">
              <p className="text-sm text-soft">{label}</p>
              <p className="mt-2 text-2xl font-black">{value ?? "—"}/5</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white/[0.04] p-5">
            <p className="font-black">What worked</p>
            <p className="mt-3 whitespace-pre-wrap text-soft">
              {record.what_worked || "Not supplied."}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-5">
            <p className="font-black">What was confusing</p>
            <p className="mt-3 whitespace-pre-wrap text-soft">
              {record.what_was_confusing || "Not supplied."}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-white/[0.04] p-5">
          <p className="font-black">Bug details</p>
          <p className="mt-3 whitespace-pre-wrap text-soft">
            {record.bug_details || "No bug details supplied."}
          </p>
        </div>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Clock3 size={20} className="text-cyan" /> Session history
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-4 text-soft">No sessions were logged.</p>
        ) : (
          <div className="mt-4 divide-y divide-white/10">
            {sessions.map((session) => (
              <article key={session.id} className="py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 font-black">
                      <MonitorSmartphone size={17} className="text-cyan" />
                      {session.device_name || "Device not provided"}
                      {session.os_version ? ` · ${session.os_version}` : ""}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-soft">
                      <CalendarClock size={15} />
                      {new Date(session.created_at).toLocaleString("en-ZA")}
                    </p>
                  </div>
                  <span className="badge">{session.minutes_tested} min</span>
                </div>
                <div className="mt-4 rounded-xl bg-white/[0.04] p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <UserRound size={15} /> Session notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-soft">
                    {session.notes?.trim() || "No notes supplied."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {record.resolution_note && (
        <section className="card mt-6 p-6">
          <h2 className="text-xl font-black">Admin resolution</h2>
          <p className="mt-3 whitespace-pre-wrap text-soft">{record.resolution_note}</p>
        </section>
      )}
    </div>
  );
}
