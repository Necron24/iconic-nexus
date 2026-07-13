import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("process_due_feedback_approvals");
    if (error) throw error;
    return NextResponse.json({ approved: data ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Auto-approval failed" }, { status: 500 });
  }
}
