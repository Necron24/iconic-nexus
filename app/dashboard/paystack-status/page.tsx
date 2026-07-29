import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paystackRequest } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export default async function PaystackStatusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const key = process.env.PAYSTACK_SECRET_KEY?.trim() || "";
  let result = "PAYSTACK_SECRET_KEY is missing in Vercel.";
  let working = false;

  if (key && !key.startsWith("sk_test_")) {
    result = "PAYSTACK_SECRET_KEY is not a Paystack test secret key.";
  } else if (key) {
    try {
      await paystackRequest<unknown>("/balance");
      result = "Paystack test key and API connection are working.";
      working = true;
    } catch (error) {
      result = error instanceof Error ? error.message : "Paystack connection failed.";
    }
  }

  return (
    <section className="card mx-auto max-w-2xl p-8">
      <p className="text-sm font-bold uppercase tracking-[.2em] text-cyan">Payment diagnostics</p>
      <h2 className="mt-2 text-3xl font-black">Paystack test connection</h2>
      <div className={`mt-6 rounded-xl border p-5 ${working ? "border-lime/30 bg-lime/10 text-lime" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
        {result}
      </div>
    </section>
  );
}
