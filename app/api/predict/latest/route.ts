import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/db/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = (searchParams.get("league") || "nfl").toLowerCase();
  const days = Number(searchParams.get("days") || 14);

  const since = new Date();
  since.setDate(since.getDate() - 1);
  const until = new Date();
  until.setDate(until.getDate() + days);

  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("games")
    .select(`
      game_id, league, game_time, away_team, home_team,
      odds:odds(*),
      predictions:predictions(*)
    `)
    .eq("league", league)
    .gte("game_time", since.toISOString())
    .lte("game_time", until.toISOString())
    .order("game_time");

  if (error) return NextResponse.json({ items: [], error: error.message });

  const items = (data || []).map((g: any) => {
    const o = Array.isArray(g.odds) ? g.odds[0] : null;
    const p = Array.isArray(g.predictions) ? g.predictions : [];
    const pick = p.find((x: any) => x.pick_type === "moneyline");
    return {
      game_id: g.game_id,
      league: g.league,
      game_time: g.game_time,
      away_team: g.away_team,
      home_team: g.home_team,
      moneyline_away: o?.moneyline_away ?? null,
      moneyline_home: o?.moneyline_home ?? null,
      line_away: o?.spread_away ?? null,
      line_home: o?.spread_home ?? null,
      total_points: o?.total_points ?? null,
      asg_pick: pick?.pick_side ?? null,
      asg_prob: pick?.confidence ?? null
    };
  });

  return NextResponse.json({ items });
}
