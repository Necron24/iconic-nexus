import { NextResponse } from "next/server";
import { completePaystackTransaction } from "@/lib/paystack-payment";
import { parsePaystackReference, paystackRequest, PaystackTransaction } from "@/lib/paystack";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref") || "";
  const parsed = parsePaystackReference(reference);
  const fallback = parsed?.kind === "subscription" ? "/dashboard/subscription" : "/dashboard/credits";
  if (!parsed) return NextResponse.redirect(new URL(`${fallback}?error=Invalid+payment+reference.`, request.url));

  try {
    const transaction = await paystackRequest<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
    await completePaystackTransaction(transaction);
    const message = parsed.kind === "subscription"
      ? "Subscription payment confirmed and your plan is active."
      : "Payment confirmed and your credits were added.";
    return NextResponse.redirect(new URL(`${fallback}?success=${encodeURIComponent(message)}`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed.";
    return NextResponse.redirect(new URL(`${fallback}?error=${encodeURIComponent(message)}`, request.url));
  }
}

