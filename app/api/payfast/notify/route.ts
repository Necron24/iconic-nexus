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

    const validationBody = createPayFastParameterString(values, false);
    const validation = await fetch(payFastValidateUrl(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: validationBody,
      cache: "no-store"
    });
    const validationText = (await validation.text()).trim();
    if (!validation.ok || validationText !== "VALID") {
      return new NextResponse("Invalid PayFast validation", { status: 400 });
    }

    const orderId = values.m_payment_id;
    const pfPaymentId = values.pf_payment_id;
    const paymentStatus = values.payment_status;
    const paidAmount = Number(values.amount_gross || values.amount_fee || 0);
    if (!orderId || !pfPaymentId || !Number.isFinite(paidAmount)) {
      return new NextResponse("Missing payment data", { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("credit_purchase_orders")
      .select("id, amount_zar, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) return new NextResponse("Order not found", { status: 404 });
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
