import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // simple health check
  return NextResponse.json({ ok: true, endpoint: "check-subscription" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let userId: string | null = body?.userId || null;

    // If no userId provided, try from cookie session
    if (!userId) {
      const supabase = createRouteHandlerClient({ cookies });
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ status: "none", reason: "no-user" });
    }

    const { data: profile, error } = await admin
      .from("profiles")
      .select("subscription_status")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }

    const status = profile?.subscription_status || "none";
    return NextResponse.json({ status });
  } catch (e: any) {
    return NextResponse.json({ status: "error", error: e?.message || "failed" }, { status: 500 });
  }
}
