import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaystackRedirect } from "./paystack-redirect";

export default async function PaystackCheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ accessCode?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { accessCode = "" } = await searchParams;
  if (!/^[a-zA-Z0-9_-]{6,200}$/.test(accessCode)) {
    redirect("/dashboard/credits?error=Invalid%20Paystack%20checkout%20session.");
  }

  const checkoutUrl = `https://checkout.paystack.com/${accessCode}`;

  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h1 className="text-3xl font-black">Opening secure checkout</h1>
      <p className="mt-3 text-soft">
        You are being redirected to Paystack. If it does not open automatically, use the button below.
      </p>
      <PaystackRedirect checkoutUrl={checkoutUrl} />
    </div>
  );
}
