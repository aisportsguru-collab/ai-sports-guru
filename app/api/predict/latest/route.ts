import { NextResponse } from "next/server";
import { Predictor } from "@/lib/model/infer";
import { fetchGames } from "@/lib/odds";

const predictor = new Predictor();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league") || "nfl";
  const date = searchParams.get("date")!;
  const days = parseInt(searchParams.get("days") || "7", 10);

  const games = await fetchGames(league, date, days);

  const enriched = games.map((g: any) => {
    // Convert odds + stats into feature vector
    const features = [
      g.ml_home, g.ml_away,
      g.spread_line, g.total_points,
      g.home_stats?.off_rating ?? 0,
      g.away_stats?.off_rating ?? 0,
      g.home_stats?.def_rating ?? 0,
      g.away_stats?.def_rating ?? 0,
      g.inj_home ?? 0,
      g.inj_away ?? 0,
    ];

    const { moneyline, spread, total } = predictor.predict(features);

    return {
      ...g,
      pick_moneyline: moneyline > 0.5 ? g.home : g.away,
      conf_moneyline: Math.round(moneyline * 100),
      pick_spread: spread > 0.5 ? `${g.home} ${g.spread_line}` : `${g.away} ${-g.spread_line}`,
      conf_spread: Math.round(spread * 100),
      pick_total: total > 0.5 ? `Over ${g.total_points}` : `Under ${g.total_points}`,
      conf_total: Math.round(total * 100),
    };
  });

  return NextResponse.json({
    ok: true,
    league,
    count: enriched.length,
    games: enriched,
  });
}
