import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EVENTS = new Set(["impression", "view", "link_click", "share"]);
const TARGETS = new Set(["project", "devlog", "campaign"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ ok: false }, { status: 403 });
    } catch {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = String(payload.eventType ?? "");
  const targetType = String(payload.targetType ?? "");
  const targetId = String(payload.targetId ?? "");
  const rawVisitor = String(payload.visitorId ?? "").slice(0, 80);
  const source = String(payload.source ?? "").replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 80) || null;

  if (!EVENTS.has(eventType) || !TARGETS.has(targetType) || !UUID.test(targetId) || rawVisitor.length < 16) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_HASH_SALT || process.env.NEXT_PUBLIC_SITE_URL || "iconic-nexus-analytics";
  const visitorHash = createHash("sha256").update(`${salt}:${day}:${rawVisitor}`).digest("hex");
  const supabase = await createClient();
  const { error } = await supabase.rpc("track_analytics_event", {
    p_event_type: eventType,
    p_target_type: targetType,
    p_target_id: targetId,
    p_visitor_hash: visitorHash,
    p_source: source
  });

  return NextResponse.json({ ok: !error }, { status: error ? 400 : 200 });
}
