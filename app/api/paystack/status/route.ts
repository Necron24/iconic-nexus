import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paystackRequest } from "@/lib/paystack";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ configured: false, error: "Authentication required." }, { status: 401 });

  const key = process.env.PAYSTACK_SECRET_KEY?.trim() || "";
  if (!key) return NextResponse.json({ configured: false, error: "PAYSTACK_SECRET_KEY is missing in Vercel." });
  if (!key.startsWith("sk_test_")) {
    return NextResponse.json({ configured: false, error: "PAYSTACK_SECRET_KEY is not a Paystack test secret key." });
  }

  try {
    await paystackRequest<unknown>("/balance");
    return NextResponse.json({ configured: true, mode: "test", apiConnection: "working" });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      mode: "test",
      error: error instanceof Error ? error.message : "Paystack connection failed."
    });
  }
}
