export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

export async function POST(req: Request) {
  const auth = checkAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", ...auth }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entries = Array.isArray(body?.entries) ? body.entries : [];
  if (!entries.length) {
    return NextResponse.json({ ok: true, inserted_or_updated: 0, ids: [] });
  }

  const rows = entries.map((e: any) => ({
    sport: e.sport,
    season: e.season ?? null,
    week: e.week ?? null,
    game_date: e.game_date,
    home_team: e.home_team,
    away_team: e.away_team,
    predicted_winner: e.predicted_winner ?? null,
    confidence: e.confidence ?? null,
    spread_pick: e.spread_pick ?? null,
    ou_pick: e.ou_pick ?? null,
    offense_favor: e.offense_favor ?? null,
    defense_favor: e.defense_favor ?? null,
    key_players_home: e.key_players_home ?? [],
    key_players_away: e.key_players_away ?? [],
    analysis: e.analysis ?? null,
    source_tag: e.source_tag ?? "api",
  }));

  const { data, error } = await supabase
    .from("ai_research_predictions")
    .upsert(rows, {
      onConflict: "sport,season,week,game_date,home_team,away_team",
    })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted_or_updated: data?.length ?? 0,
    ids: data?.map((d) => d.id) ?? [],
  });
}
