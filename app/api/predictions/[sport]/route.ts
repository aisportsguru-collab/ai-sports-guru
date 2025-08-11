import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_SPORTS = new Set(["ncaaf","nfl","nba","mlb","nhl","wnba","ncaab"]);

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: Request, { params }: any) {
  const sport = (params?.sport || "").toLowerCase();
  if (!VALID_SPORTS.has(sport)) {
    return bad(`Invalid sport. Use one of: ${Array.from(VALID_SPORTS).join(", ")}`);
  }

  const url = new URL(req.url);
  const season = parseInt(url.searchParams.get("season") || "2025", 10);
  const week = url.searchParams.get("week");
  const dateFrom = url.searchParams.get("date_from"); // YYYY-MM-DD
  const dateTo = url.searchParams.get("date_to");     // YYYY-MM-DD
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "200", 10), 200);

  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) {
    return bad("Server not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)", 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let query = supabase
    .from("ai_research_predictions")
    .select(`
      id, sport, season, week, game_date,
      home_team, away_team,
      predicted_winner, confidence,
      offense_favor, defense_favor,
      key_players_home, key_players_away,
      spread_pick, ou_pick,
      source_tag, created_at
    `)
    .eq("sport", sport)
    .eq("season", season)
    .order("game_date", { ascending: true })
    .limit(limit);

  if (week) query = query.eq("week", parseInt(week, 10));
  if (dateFrom) query = query.gte("game_date", dateFrom);
  if (dateTo) query = query.lte("game_date", dateTo);

  const { data, error } = await query;
  if (error) {
    console.error("Predictions fetch error:", error);
    return bad("Failed to fetch predictions", 500);
  }

  const res = NextResponse.json({ sport, season, count: data?.length || 0, results: data || [] });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Cache-Control", "public, max-age=60");
  return res;
}
