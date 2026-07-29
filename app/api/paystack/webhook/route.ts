import { NextResponse } from "next/server";
import { completePaystackTransaction } from "@/lib/paystack-payment";
import { PaystackTransaction, verifyPaystackSignature } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyPaystackSignature(body, request.headers.get("x-paystack-signature"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  try {
    const event = JSON.parse(body) as { event?: string; data?: PaystackTransaction };
    if (event.event === "charge.success" && event.data) {
      await completePaystackTransaction(event.data);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error", error);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}

