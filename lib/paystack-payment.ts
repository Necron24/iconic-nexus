import { createAdminClient } from "@/lib/supabase/admin";
import { parsePaystackReference, PaystackTransaction } from "@/lib/paystack";

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

