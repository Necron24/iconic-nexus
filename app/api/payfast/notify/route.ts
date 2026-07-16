import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPayFastParameterString, createPayFastSignature, payFastValidateUrl, safeEqual } from "@/lib/payfast";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const values: Record<string, string> = {};
    params.forEach((value, key) => { values[key] = value; });

    const receivedSignature = values.signature || "";
    if (!receivedSignature || !safeEqual(receivedSignature, createPayFastSignature(values))) {
      return new NextResponse("Invalid signature", { status: 400 });
    }

    const validation = await fetch(payFastValidateUrl(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: createPayFastParameterString(values, false),
      cache: "no-store"
    });
    if (!validation.ok || (await validation.text()).trim() !== "VALID") {
      return new NextResponse("Invalid PayFast validation", { status: 400 });
    }

    const orderId = values.m_payment_id;
    const pfPaymentId = values.pf_payment_id;
    const paymentStatus = values.payment_status;
    const paidAmount = Number(values.amount_gross || 0);
    if (!orderId || !pfPaymentId || !Number.isFinite(paidAmount)) {
      return new NextResponse("Missing payment data", { status: 400 });
    }

    const admin = createAdminClient();

    if (values.custom_str5 === "subscription") {
      const { data: order } = await admin
        .from("subscription_purchase_orders")
        .select("id, amount_zar, status")
        .eq("id", orderId)
        .maybeSingle();

      if (!order) return new NextResponse("Subscription order not found", { status: 404 });
      if (Math.abs(Number(order.amount_zar) - paidAmount) > 0.01) {
        return new NextResponse("Amount mismatch", { status: 400 });
      }

      if (paymentStatus === "COMPLETE") {
        const { error } = await admin.rpc("complete_subscription_purchase", {
          p_order_id: orderId,
          p_payfast_payment_id: pfPaymentId,
          p_payfast_token: values.token || "",
          p_paid_amount: paidAmount,
          p_raw_payload: values
        });
        if (error) return new NextResponse(error.message, { status: 500 });
      } else if (["FAILED", "CANCELLED"].includes(paymentStatus)) {
        await admin.from("subscription_purchase_orders").update({
          status: paymentStatus.toLowerCase(),
          payfast_payment_id: pfPaymentId,
          raw_payload: values,
          updated_at: new Date().toISOString()
        }).eq("id", orderId).eq("status", "pending");
      }

      return new NextResponse("OK");
    }

    const { data: order } = await admin
      .from("credit_purchase_orders")
      .select("id, amount_zar, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return new NextResponse("Order not found", { status: 404 });
    if (Math.abs(Number(order.amount_zar) - paidAmount) > 0.01) {
      return new NextResponse("Amount mismatch", { status: 400 });
    }

    if (paymentStatus === "COMPLETE") {
      const { error } = await admin.rpc("complete_credit_purchase", {
        p_order_id: orderId,
        p_payfast_payment_id: pfPaymentId,
        p_paid_amount: paidAmount,
        p_raw_payload: values
      });
      if (error) return new NextResponse(error.message, { status: 500 });
    } else if (["FAILED", "CANCELLED"].includes(paymentStatus)) {
      await admin.from("credit_purchase_orders").update({
        status: paymentStatus.toLowerCase(),
        payfast_payment_id: pfPaymentId,
        raw_payload: values,
        updated_at: new Date().toISOString()
      }).eq("id", orderId).eq("status", "pending");
    }

    return new NextResponse("OK");
  } catch (error) {
    console.error("PayFast ITN error", error);
    return new NextResponse("Server error", { status: 500 });
  }
}
