import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: any) {
  // Next 15 is picky about the 2nd arg type; using `any` avoids the compiler error.
  const sport = String(ctx?.params?.sport ?? "").toLowerCase();

  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season") || "2025");
  const week = Number(url.searchParams.get("week") || "1");
  const debug = url.searchParams.get("debug") === "1";

  if (!sport) {
    return NextResponse.json({ error: "Missing sport" }, { status: 400 });
  }
  if (!Number.isFinite(season) || !Number.isFinite(week)) {
    return NextResponse.json({ error: "Invalid season/week" }, { status: 400 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[predictions] Missing envs", {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .from("ai_research_predictions")
      .select("*")
      .eq("sport", sport)
      .eq("season", season)
      .eq("week", week)
      .order("game_date", { ascending: true });

    if (error) {
      console.error("[predictions] Supabase select error:", {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
    }

    if (debug) {
      return NextResponse.json({
        ok: true,
        count: data?.length || 0,
        env: {
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SUPABASE_SERVICE_ROLE_KEY,
          runtime: "nodejs",
          vercelEnv: process.env.VERCEL_ENV,
        },
        data,
      });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("[predictions] Unexpected error:", {
      message: err?.message,
      stack: err?.stack,
    });
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }
}
