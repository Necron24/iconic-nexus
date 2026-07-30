import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { paystackRequest } from "@/lib/paystack";

export const runtime = "nodejs";

type PaystackSubscriptionRecord = {
  status: string;
  subscription_code: string;
  email_token: string;
  next_payment_date?: string | null;
  customer?: { customer_code?: string } | number | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const { data: subscription } = await supabase
    .from("profile_subscriptions")
    .select("plan_code,status,paystack_customer_code,payfast_token,paystack_subscription_code,paystack_email_token")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!subscription || subscription.plan_code === "free") {
    return NextResponse.redirect(
      new URL("/dashboard/subscription?error=No+paid+subscription+was+found.", request.url),
      303
    );
  }

  try {
    const customerCode = subscription.paystack_customer_code || subscription.payfast_token || "";
    let code = subscription.paystack_subscription_code || "";
    let token = subscription.paystack_email_token || "";

    if ((!code || !token) && customerCode) {
      const subscriptions = await paystackRequest<PaystackSubscriptionRecord[]>("/subscription?perPage=100");
      const active = subscriptions.find((item) => {
        const itemCustomer = typeof item.customer === "object" && item.customer
          ? item.customer.customer_code
          : "";
        return itemCustomer === customerCode && ["active", "non-renewing", "attention"].includes(item.status);
      });
      if (active) {
        code = active.subscription_code;
        token = active.email_token;
        const admin = createAdminClient();
        await admin.from("profile_subscriptions").update({
          paystack_subscription_code: code,
          paystack_email_token: token,
          next_payment_date: active.next_payment_date || null,
          updated_at: new Date().toISOString()
        }).eq("profile_id", user.id);
      }
    }

    if (!code || !token) throw new Error("Paystack subscription details are not available yet.");

    await paystackRequest<unknown>("/subscription/disable", {
      method: "POST",
      body: JSON.stringify({ code, token })
    });

    const admin = createAdminClient();
    const { error } = await admin.from("profile_subscriptions").update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    }).eq("profile_id", user.id);
    if (error) throw new Error(error.message);

    return NextResponse.redirect(
      new URL("/dashboard/subscription?success=Your+subscription+will+not+renew+again.", request.url),
      303
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscription cancellation failed.";
    return NextResponse.redirect(
      new URL(`/dashboard/subscription?error=${encodeURIComponent(message)}`, request.url),
      303
    );
  }
}
