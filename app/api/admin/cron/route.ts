import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

// Calls our daily cron endpoint internally
export const runtime = "nodejs";

const CRON_KEY = process.env.CRON_SECRET || "c52cb737a3232e82bb8e1a4264c7e187";

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // lightweight check: only your admin email can run this via UI
  const email = data.user.email || "";
  if (email !== "smithajordan1992@gmail.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/cron/run-daily?key=${CRON_KEY}`, {
      method: "GET",
    });
    const j = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: r.ok, result: j });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
