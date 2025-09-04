import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function pickAsg(row: any){
  const pick = row?.asg_pick ?? row?.pick ?? row?.side ?? row?.prediction ?? row?.ml_pick ?? null;
  const prob = row?.asg_prob ?? row?.prob ?? row?.probability ?? row?.confidence ?? row?.win_prob ?? null;
  return { asg_pick: pick, asg_prob: typeof prob === "number" ? prob : (prob!=null ? Number(prob) : null) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") || "").toLowerCase();
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const range = Math.max(1, Math.min(31, Number(searchParams.get("range") || 7)));
  if (!league) return NextResponse.json({ error: "league is required" }, { status: 400 });

  const start = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + range);

  const { data: games, error: gErr } = await supabaseAdmin
    .from("games")
    .select("game_id, sport, commence_time, away_team, home_team")
    .eq("sport", league)
    .gte("commence_time", start.toISOString())
    .lte("commence_time", end.toISOString())
    .order("commence_time", { ascending: true });
  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

  const ids = (games ?? []).map(g => g.game_id);

  const [oddsRes, predsRes] = await Promise.all([
    ids.length ? supabaseAdmin.from("odds")
      .select("game_id, moneyline_home, moneyline_away, spread_line, spread_home, spread_away, total_points, over_odds, under_odds, updated_at")
      .in("game_id", ids)
      .order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? supabaseAdmin.from("predictions")
      .select("*")
      .in("game_id", ids)
      .order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ] as const);

  const oddsById: Record<string, any> = {};
  let lastUpdated: string | null = null;
  for (const o of oddsRes.data ?? []) {
    if (!oddsById[o.game_id]) oddsById[o.game_id] = o;
    if (o?.updated_at && (!lastUpdated || o.updated_at > lastUpdated)) lastUpdated = o.updated_at;
  }
  const predsById: Record<string, any> = {};
  for (const p of predsRes.data ?? []) {
    if (!predsById[p.game_id]) predsById[p.game_id] = p;
    if (p?.updated_at && (!lastUpdated || p.updated_at > lastUpdated)) lastUpdated = p.updated_at;
  }

  const out = (games ?? []).map(g => {
    const o = oddsById[g.game_id] || {};
    const pRaw = predsById[g.game_id] || {};
    const { asg_pick, asg_prob } = pickAsg(pRaw);
    const lineHome = o.spread_line ?? null;
    const lineAway = typeof o.spread_line === "number" ? -o.spread_line : null;

    return {
      game_id: g.game_id,
      league: g.sport,
      home_team: g.home_team,
      away_team: g.away_team,
      game_time: g.commence_time,
      moneyline_home: o.moneyline_home ?? null,
      moneyline_away: o.moneyline_away ?? null,
      line_home: lineHome,
      line_away: lineAway,
      total_points: o.total_points ?? null,
      over_odds: o.over_odds ?? null,
      under_odds: o.under_odds ?? null,
      asg_pick,
      asg_prob,
    };
  });

  return NextResponse.json({
    league,
    date: dateStr || new Date().toISOString().slice(0, 10),
    range,
    lastUpdated,
    games: out,
  });
}
