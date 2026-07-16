import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayFastSignature, payFastProcessUrl } from "@/lib/payfast";

export const runtime = "nodejs";

function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_SITE_URL is missing.");
  return `${base}${path}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const formData = await request.formData();
  const packCode = String(formData.get("packCode") ?? "").trim();
  if (!packCode) return NextResponse.redirect(new URL("/dashboard/credits?error=Choose+a+credit+pack.", request.url), 303);

  const { data, error } = await supabase.rpc("create_credit_purchase_order", { p_pack_code: packCode });
  const order = Array.isArray(data) ? data[0] : data;
  if (error || !order) {
    const message = encodeURIComponent(error?.message || "The payment order could not be created.");
    return NextResponse.redirect(new URL(`/dashboard/credits?error=${message}`, request.url), 303);
  }

  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY?.trim();
  if (!merchantId || !merchantKey) {
    return NextResponse.redirect(new URL("/dashboard/credits?error=PayFast+is+not+configured+yet.", request.url), 303);
  }

  const paymentId = String(order.order_id);
  const fields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: absoluteUrl(`/dashboard/credits/payment-return?order=${paymentId}`),
    cancel_url: absoluteUrl(`/dashboard/credits/payment-cancelled?order=${paymentId}`),
    notify_url: absoluteUrl("/api/payfast/notify"),
    name_first: String(user.user_metadata?.display_name || user.user_metadata?.full_name || "Iconic Nexus"),
    email_address: user.email || "",
    m_payment_id: paymentId,
    amount: Number(order.amount_zar).toFixed(2),
    item_name: `${order.credits} Nexus Credits`,
    item_description: `Iconic Nexus ${order.pack_name} credit pack`,
    custom_str1: user.id,
    custom_str2: String(order.pack_code)
  };
  fields.signature = createPayFastSignature(fields);

  const inputs = Object.entries(fields)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`)
    .join("");

  return new NextResponse(`<!doctype html><html><head><meta charset="utf-8"><title>Redirecting to PayFast</title></head><body><form id="payfast" method="post" action="${payFastProcessUrl()}">${inputs}</form><script>document.getElementById('payfast').submit();</script><noscript><button form="payfast">Continue to PayFast</button></noscript></body></html>`, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}
