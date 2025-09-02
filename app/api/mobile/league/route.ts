import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") || "").toLowerCase();
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const range = Math.max(1, Math.min(31, Number(searchParams.get("range") || 7)));

  if (!league) {
    return NextResponse.json({ error: "league is required" }, { status: 400 });
  }

  // window: date..date+range
  const start = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + range);

  try {
    const { data: games, error } = await supabaseAdmin
      .from("games")
      .select("id, sport, home_team, away_team, commence_time")
      .eq("sport", league)
      .gte("commence_time", start.toISOString())
      .lte("commence_time", end.toISOString())
      .order("commence_time", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // join latest odds via v_latest_odds if you have it; otherwise return minimal
    const ids = (games ?? []).map(g => g.id);
    let oddsById: Record<string, any> = {};
    if (ids.length) {
      const { data: odds } = await supabaseAdmin
        .from("v_latest_odds")
        .select("game_id, moneyline_home, moneyline_away, spread_line, spread_home, spread_away, total_points, over_odds, under_odds")
        .in("game_id", ids);

      for (const o of odds ?? []) oddsById[o.game_id] = o;
    }

    const out = (games ?? []).map(g => {
      const o = oddsById[g.id] || {};
      return {
        id: g.id,
        league: g.sport,
        home: g.home_team,
        away: g.away_team,
        start: g.commence_time,
        ml_home: o.moneyline_home ?? null,
        ml_away: o.moneyline_away ?? null,
        spread_home_points: o.spread_line ?? null,   // adjust if you store side-specific points/prices
        spread_home_price: o.spread_home ?? null,
        spread_away_points: o.spread_line ?? null,
        spread_away_price: o.spread_away ?? null,
        total_points: o.total_points ?? null,
        over_price: o.over_odds ?? null,
        under_price: o.under_odds ?? null,
        model_moneyline: null,
        model_spread: null,
        model_total: null,
        model_confidence: null,
      };
    });

    return NextResponse.json({
      league,
      date: dateStr || new Date().toISOString().slice(0, 10),
      range,
      games: out,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
