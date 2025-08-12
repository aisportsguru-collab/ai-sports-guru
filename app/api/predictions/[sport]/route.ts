export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// Do NOT type the second argument; Next's analyzer can reject custom types here.
export async function GET(req: Request, context: any) {
  try {
    const sport: string = context?.params?.sport;
    const url = new URL(req.url);
    const seasonStr = url.searchParams.get("season");
    const weekStr = url.searchParams.get("week");
    const debug = url.searchParams.get("debug") === "1";

    if (!seasonStr) {
      return NextResponse.json({ error: "Missing ?season" }, { status: 400 });
    }
    const season = Number(seasonStr);

    const isWeekly = sport === "nfl" || sport === "ncaaf";

    let q = supabase
      .from("ai_research_predictions")
      .select("*")
      .eq("sport", sport)
      .eq("season", season)
      .order("game_date", { ascending: true });

    if (isWeekly) {
      if (!weekStr || Number.isNaN(Number(weekStr))) {
        return NextResponse.json(
          { error: "Missing ?week for this sport" },
          { status: 400 }
        );
      }
      q = q.eq("week", Number(weekStr));
    } else {
      // Non-weekly sports: only rows that have week = NULL
      q = q.is("week", null);
    }

    const { data, error } = await q;
    if (error) throw error;

    if (debug) {
      return NextResponse.json({
        ok: true,
        sport,
        season,
        week: isWeekly ? Number(weekStr) : null,
        isWeekly,
        count: data?.length ?? 0,
        data,
      });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    console.error("Predictions fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 }
    );
  }
}
