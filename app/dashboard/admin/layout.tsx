import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  return <div>
    <div className="mb-5 rounded-2xl border border-red-300/20 bg-gradient-to-r from-red-400/10 to-transparent p-5">
      <p className="text-xs font-black uppercase tracking-[.22em] text-red-200">Restricted area</p>
      <h2 className="mt-2 text-3xl font-black">Nexus administration</h2>
      <p className="mt-2 text-sm text-soft">Platform health, activity, revenue operations and community safety in one protected workspace.</p>
    </div>
    <AdminNav />
    {children}
  </div>;
}
