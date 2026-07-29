import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paystackReference, paystackRequest } from "@/lib/paystack";

export const runtime = "nodejs";

function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL is missing.");
  return value;
}

type PaystackPlan = { plan_code: string; name: string; amount: number; interval: string };

async function getOrCreatePlan(name: string, amount: number) {
  const plans = await paystackRequest<PaystackPlan[]>("/plan?perPage=100");
  const existing = plans.find((plan) => plan.name === name && plan.amount === amount && plan.interval === "monthly");
  if (existing) return existing.plan_code;
  const created = await paystackRequest<PaystackPlan>("/plan", {
    method: "POST",
    body: JSON.stringify({ name, amount, interval: "monthly", currency: "ZAR" })
  });
  return created.plan_code;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const planCode = String(form.get("planCode") ?? "").trim();
  const { data, error } = await supabase.rpc("create_subscription_order", { p_plan_code: planCode });
  const order = Array.isArray(data) ? data[0] : data;
  if (error || !order) {
    return NextResponse.redirect(new URL(`/dashboard/subscription?error=${encodeURIComponent(error?.message || "Subscription order failed.")}`, request.url), 303);
  }

  try {
    const amount = Math.round(Number(order.amount_zar) * 100);
    const paystackPlan = await getOrCreatePlan(String(order.plan_name), amount);
    const reference = paystackReference("subscription", String(order.order_id));
    const result = await paystackRequest<{ authorization_url: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount,
        currency: "ZAR",
        reference,
        plan: paystackPlan,
        callback_url: `${siteUrl()}/api/paystack/callback`,
        metadata: {
          order_id: order.order_id,
          payment_type: "subscription",
          plan_code: order.plan_code
        }
      })
    });
    return NextResponse.redirect(result.authorization_url, 303);
  } catch (paymentError) {
    const message = paymentError instanceof Error ? paymentError.message : "Paystack subscription checkout failed.";
    return NextResponse.redirect(new URL(`/dashboard/subscription?error=${encodeURIComponent(message)}`, request.url), 303);
  }
}

