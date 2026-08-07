import { DashboardNav } from "@/components/dashboard-nav";
import { OnboardingTour } from "@/components/onboarding-tour";
import { completeOnboarding } from "@/app/dashboard/onboarding/actions";
import { createClient } from "@/lib/supabase/server";

type OnboardingRole = "tester" | "developer" | "both";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let showOnboarding = false;
  let role: OnboardingRole = "both";
  let isAdmin = false;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed,role,is_admin")
      .eq("id", user.id)
      .maybeSingle();

    showOnboarding = data?.onboarding_completed === false;
    role = data?.role === "tester" || data?.role === "developer" ? data.role : "both";
    isAdmin = data?.is_admin === true;
  }

  return (
    <section className="container-page py-12">
      {showOnboarding && <OnboardingTour initialRole={role} completeAction={completeOnboarding} />}
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[.25em] text-cyan">Dashboard</p>
        <h1 className="mt-2 text-4xl font-black">Your Iconic Nexus workspace</h1>
      </div>
      <DashboardNav isAdmin={isAdmin} />
      <div className="mt-6">{children}</div>
    </section>
  );
}
