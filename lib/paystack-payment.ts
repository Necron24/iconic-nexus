import { createAdminClient } from "@/lib/supabase/admin";
import {
  parsePaystackReference,
  PaystackDisputeEvent,
  PaystackInvoiceEvent,
  PaystackRefundEvent,
  PaystackSubscriptionEvent,
  PaystackTransaction
} from "@/lib/paystack";

export async function completePaystackTransaction(data: PaystackTransaction) {
  if (data.status !== "success" || data.currency !== "ZAR") {
    throw new Error("Payment was not completed in ZAR.");
  }
  const parsed = parsePaystackReference(data.reference);
  if (!parsed) throw new Error("Invalid payment reference.");

  const paidAmount = Number(data.amount) / 100;
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) throw new Error("Invalid payment amount.");

  const admin = createAdminClient();
  if (parsed.kind === "credit") {
    const { data: order } = await admin
      .from("credit_purchase_orders")
      .select("id,amount_zar,status")
      .eq("id", parsed.orderId)
      .maybeSingle();
    if (!order) throw new Error("Credit order not found.");
    if (Math.abs(Number(order.amount_zar) - paidAmount) > 0.01) throw new Error("Payment amount mismatch.");
    const { error } = await admin.rpc("complete_credit_purchase", {
      p_order_id: parsed.orderId,
      p_payfast_payment_id: data.reference,
      p_paid_amount: paidAmount,
      p_raw_payload: data
    });
    if (error) throw new Error(error.message);
    return { kind: parsed.kind, orderId: parsed.orderId };
  }

  const { data: order } = await admin
    .from("subscription_purchase_orders")
    .select("id,amount_zar,status")
    .eq("id", parsed.orderId)
    .maybeSingle();
  if (!order) throw new Error("Subscription order not found.");
  if (Math.abs(Number(order.amount_zar) - paidAmount) > 0.01) throw new Error("Payment amount mismatch.");
  const { error } = await admin.rpc("complete_subscription_purchase", {
    p_order_id: parsed.orderId,
    p_payfast_payment_id: data.reference,
    p_payfast_token: data.customer?.customer_code || "",
    p_paid_amount: paidAmount,
    p_raw_payload: data
  });
  if (error) throw new Error(error.message);
  return { kind: parsed.kind, orderId: parsed.orderId };
}

function customerCode(customer: PaystackSubscriptionEvent["customer"] | PaystackInvoiceEvent["customer"]) {
  return typeof customer === "object" && customer ? customer.customer_code || "" : "";
}

export async function linkPaystackSubscription(data: PaystackSubscriptionEvent) {
  const code = data.subscription_code || "";
  const token = data.email_token || "";
  const customer = customerCode(data.customer);
  if (!code || !token || !customer) throw new Error("Incomplete Paystack subscription event.");
  const admin = createAdminClient();
  const { error } = await admin.rpc("link_paystack_subscription", {
    p_customer_code: customer,
    p_subscription_code: code,
    p_email_token: token,
    p_next_payment_date: data.next_payment_date || null,
    p_raw_payload: data
  });
  if (error) throw new Error(error.message);
}

export async function completePaystackRenewal(data: PaystackTransaction | PaystackInvoiceEvent) {
  const invoice = data as PaystackInvoiceEvent;
  const transaction = invoice.transaction;
  const transactionData = data as PaystackTransaction;
  const subscription = invoice.subscription || transactionData.subscription;
  const customer = customerCode(invoice.customer || transactionData.customer);
  const reference = transaction?.reference || transactionData.reference || "";
  const amount = Number(transaction?.amount ?? invoice.amount ?? transactionData.amount) / 100;
  const currency = transaction?.currency || transactionData.currency;
  const code = subscription?.subscription_code || "";
  if (!reference || !customer || !code || currency !== "ZAR" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Incomplete Paystack renewal event.");
  }
  const admin = createAdminClient();
  const { error } = await admin.rpc("complete_subscription_renewal", {
    p_customer_code: customer,
    p_subscription_code: code,
    p_reference: reference,
    p_paid_amount: amount,
    p_period_start: invoice.period_start || transactionData.paid_at || null,
    p_period_end: invoice.period_end || subscription?.next_payment_date || null,
    p_raw_payload: data
  });
  if (error) throw new Error(error.message);
}

export async function markPaystackSubscriptionEvent(
  eventType: "invoice.payment_failed" | "subscription.not_renew" | "subscription.disable",
  data: PaystackInvoiceEvent | PaystackSubscriptionEvent
) {
  const invoice = data as PaystackInvoiceEvent;
  const subscription = invoice.subscription || (data as PaystackSubscriptionEvent);
  const customer = customerCode(invoice.customer || subscription.customer);
  const code = subscription.subscription_code || "";
  const reference = eventType === "invoice.payment_failed"
    ? `${eventType}:${invoice.invoice_code || code}`
    : `${eventType}:${code}`;
  if (!code || !reference) throw new Error("Incomplete Paystack subscription status event.");
  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_subscription_event", {
    p_subscription_code: code,
    p_customer_code: customer,
    p_event_type: eventType,
    p_event_reference: reference,
    p_raw_payload: data
  });
  if (error) throw new Error(error.message);
}

export async function processPaystackReversal(
  eventType: "refund.processed" | "charge.dispute.create",
  data: PaystackRefundEvent | PaystackDisputeEvent
) {
  const refund = data as PaystackRefundEvent;
  const dispute = data as PaystackDisputeEvent;
  const disputeReference = typeof dispute.transaction === "object" && dispute.transaction
    ? dispute.transaction.reference || ""
    : "";
  const paymentReference = refund.transaction_reference || disputeReference;
  const eventId = refund.refund_reference || dispute.id || paymentReference;
  if (!paymentReference || !eventId) throw new Error("Incomplete Paystack reversal event.");
  const admin = createAdminClient();
  const { error } = await admin.rpc("process_paystack_reversal", {
    p_payment_reference: paymentReference,
    p_event_key: `${eventType}:${eventId}`,
    p_event_type: eventType,
    p_raw_payload: data
  });
  if (error) throw new Error(error.message);
}

