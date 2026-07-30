import crypto from "node:crypto";

const PAYSTACK_API = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("Paystack is not configured yet.");
  return key;
}

export async function paystackRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message || "Paystack request failed.");
  }
  return payload.data as T;
}

export function verifyPaystackSignature(body: string, signature: string | null) {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", secretKey())
    .update(body)
    .digest("hex");
  const left = Buffer.from(signature.toLowerCase());
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function paystackReference(kind: "credit" | "subscription", orderId: string) {
  return `nexus-${kind}-${orderId}`;
}

export function parsePaystackReference(reference: string) {
  const match = /^nexus-(credit|subscription)-([0-9a-f-]{36})$/i.exec(reference);
  return match ? { kind: match[1] as "credit" | "subscription", orderId: match[2] } : null;
}

export type PaystackTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
  customer?: { customer_code?: string; email?: string };
  plan?: { plan_code?: string } | string | null;
  subscription?: {
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string;
  } | null;
  paid_at?: string | null;
};

export type PaystackSubscriptionEvent = {
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string | null;
  status?: string;
  customer?: { customer_code?: string; email?: string } | string | number | null;
  plan?: { plan_code?: string } | string | number | null;
};

export type PaystackInvoiceEvent = {
  invoice_code?: string;
  amount?: number;
  period_start?: string | null;
  period_end?: string | null;
  status?: string;
  paid?: boolean;
  subscription?: PaystackSubscriptionEvent | null;
  customer?: { customer_code?: string; email?: string } | null;
  transaction?: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
  } | null;
};

export type PaystackRefundEvent = {
  status?: string;
  transaction_reference?: string;
  refund_reference?: string | null;
  amount?: string | number;
  currency?: string;
};

export type PaystackDisputeEvent = {
  id?: string | number;
  status?: string;
  transaction?: { reference?: string } | string | number | null;
};

