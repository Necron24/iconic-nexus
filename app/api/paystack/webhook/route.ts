import { NextResponse } from "next/server";
import {
  completePaystackRenewal,
  completePaystackTransaction,
  linkPaystackSubscription,
  markPaystackSubscriptionEvent,
  processPaystackReversal
} from "@/lib/paystack-payment";
import {
  parsePaystackReference,
  PaystackDisputeEvent,
  PaystackInvoiceEvent,
  PaystackRefundEvent,
  PaystackSubscriptionEvent,
  PaystackTransaction,
  verifyPaystackSignature
} from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyPaystackSignature(body, request.headers.get("x-paystack-signature"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  try {
    const event = JSON.parse(body) as { event?: string; data?: unknown };
    if (!event.event || !event.data) return NextResponse.json({ received: true });

    if (event.event === "charge.success") {
      const transaction = event.data as PaystackTransaction;
      if (parsePaystackReference(transaction.reference)) {
        await completePaystackTransaction(transaction);
      } else if (transaction.subscription?.subscription_code) {
        await completePaystackRenewal(transaction);
      }
    } else if (event.event === "invoice.update") {
      const invoice = event.data as PaystackInvoiceEvent;
      if (invoice.paid && invoice.transaction?.status === "success") {
        await completePaystackRenewal(invoice);
      }
    } else if (event.event === "subscription.create") {
      await linkPaystackSubscription(event.data as PaystackSubscriptionEvent);
    } else if (event.event === "invoice.payment_failed") {
      await markPaystackSubscriptionEvent(event.event, event.data as PaystackInvoiceEvent);
    } else if (event.event === "subscription.not_renew" || event.event === "subscription.disable") {
      await markPaystackSubscriptionEvent(event.event, event.data as PaystackSubscriptionEvent);
    } else if (event.event === "refund.processed" || event.event === "charge.dispute.create") {
      await processPaystackReversal(
        event.event,
        event.data as PaystackRefundEvent | PaystackDisputeEvent
      );
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error", error);
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}

