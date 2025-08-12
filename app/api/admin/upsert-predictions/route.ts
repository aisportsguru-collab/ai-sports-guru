export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const WEEKLY_SPORTS = new Set(["nfl", "ncaaf"]);

function getAdminTokenFromReq(req: Request): string | null {
  const h1 = req.headers.get("x-admin-token");
  if (h1) return h1;
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const incoming = getAdminTokenFromReq(req);
    const expected = process.env.ADMIN_TOKEN;
    if (!expected || !incoming || incoming !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const entries = body?.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "No entries" }, { status: 400 });
    }

    // Normalize week: weekly sports require finite week; others -> 0
    const normalized = entries.map((e: any) => {
      const sport = String(e.sport || "").toLowerCase();
      let week: number;

      if (WEEKLY_SPORTS.has(sport)) {
        if (!Number.isFinite(Number(e.week))) {
          throw new Error(`Missing or invalid week for sport=${sport}`);
        }
        week = Number(e.week);
      } else {
        week = 0;
      }

      return {
        sport,
        season: Number(e.season),
        week,
        game_date: e.game_date, // YYYY-MM-DD
        home_team: e.home_team,
        away_team: e.away_team,
        predicted_winner: e.predicted_winner ?? null,
        confidence: e.confidence ?? null,
        spread_pick: e.spread_pick ?? null,
        ou_pick: e.ou_pick ?? null,
        offense_favor: e.offense_favor ?? null,
        defense_favor: e.defense_favor ?? null,
        key_players_home: e.key_players_home ?? null,
        key_players_away: e.key_players_away ?? null,
        analysis: e.analysis ?? null,
        source_tag: e.source_tag ?? null,
      };
    });

    // Upsert on the unique game key
    const { data, error } = await supabase
      .from("ai_research_predictions")
      .upsert(normalized, {
        onConflict:
          "sport,season,week,game_date,home_team,away_team",
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      inserted_or_updated: data?.length ?? 0,
      errors: [],
      ids: (data ?? []).map((r: any) => r.id),
    });
  } catch (err: any) {
    console.error("upsert-predictions error:", err);
    return NextResponse.json(
      { error: "Upsert failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
