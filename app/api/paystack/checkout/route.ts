import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paystackReference, paystackRequest } from "@/lib/paystack";

export const runtime = "nodejs";

function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL is missing.");
  return value;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const packCode = String(form.get("packCode") ?? "").trim();
  const { data, error } = await supabase.rpc("create_credit_purchase_order", { p_pack_code: packCode });
  const order = Array.isArray(data) ? data[0] : data;
  if (error || !order) {
    return NextResponse.redirect(new URL(`/dashboard/credits?error=${encodeURIComponent(error?.message || "Payment order failed.")}`, request.url), 303);
  }

  try {
    const reference = paystackReference("credit", String(order.order_id));
    const result = await paystackRequest<{ authorization_url: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(Number(order.amount_zar) * 100),
        currency: "ZAR",
        reference,
        callback_url: `${siteUrl()}/api/paystack/callback`,
        metadata: {
          order_id: order.order_id,
          payment_type: "credit",
          pack_code: order.pack_code,
          credits: order.credits
        }
      })
    });
    return NextResponse.redirect(result.authorization_url, 303);
  } catch (paymentError) {
    const message = paymentError instanceof Error ? paymentError.message : "Paystack checkout failed.";
    return NextResponse.redirect(new URL(`/dashboard/credits?error=${encodeURIComponent(message)}`, request.url), 303);
  }
}

