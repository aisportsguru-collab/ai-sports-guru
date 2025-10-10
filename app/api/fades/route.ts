import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Row = {
  game_id: string;
  game_time: string | null;
  league: string | null;
  away_team: string;
  home_team: string;
  pick: string | null;
  prob: number | null;
  public_away: number | null;
  public_home: number | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") ?? "all").toLowerCase();
  const publicThreshold = Number(searchParams.get("publicThreshold") ?? "65") / 100; // e.g. 0.65
  const minConfidence = Number(searchParams.get("minConfidence") ?? "0.55");        // already 0..1
  const days = Number(searchParams.get("days") ?? "14");

  const sb = createClient(url, anon);

  // Pull games in the window, latest prediction per game (model=asg_v1), and public away/home %
  const since = new Date().toISOString();
  const until = new Date(Date.now() + days * 24 * 3600_000).toISOString();

  // Fetch games first
  let q = sb
    .from("games")
    .select("game_id, league, game_time, away_team, home_team")
    .gte("game_time", since)
    .lte("game_time", until)
    .order("game_time", { ascending: true });

  if (league !== "all") q = q.eq("league", league);

  const { data: games, error: gErr } = await q;
  if (gErr) return NextResponse.json({ items: [], error: gErr.message }, { status: 200 });

  if (!games?.length) return NextResponse.json({ items: [] }, { status: 200 });

  const ids = games.map(g => g.game_id);

  // Predictions
  const { data: preds, error: pErr } = await sb
    .from("predictions")
    .select("game_id, pick, prob, model")
    .in("game_id", ids)
    .eq("model", "asg_v1");
  if (pErr) return NextResponse.json({ items: [], error: pErr.message }, { status: 200 });

  // Public bets home/away
  const { data: pb, error: bErr } = await sb
    .from("public_bets")
    .select("game_id, side, percent")
    .in("game_id", ids);
  if (bErr) return NextResponse.json({ items: [], error: bErr.message }, { status: 200 });

  const pbMap = new Map<string, { home?: number; away?: number }>();
  for (const r of pb ?? []) {
    const cur = pbMap.get(r.game_id) ?? {};
    if (r.side === "home") cur.home = Number(r.percent);
    if (r.side === "away") cur.away = Number(r.percent);
    pbMap.set(r.game_id, cur);
  }
  const predMap = new Map(preds?.map(p => [p.game_id, p]) ?? []);

  const items: any[] = [];
  for (const g of games as any[]) {
    const pr = predMap.get(g.game_id);
    const pb = pbMap.get(g.game_id) || {};
    if (!pr || pr.prob == null) continue;

    // Only consider confident model picks
    if (pr.prob < minConfidence) continue;

    // Determine if public is heavy on the OPPOSITE side
    // Normalize pick: match to home/away team names
    const pickTeam = (pr.pick ?? "").toLowerCase();
    const isHomePick = pickTeam === String(g.home_team).toLowerCase();
    const isAwayPick = pickTeam === String(g.away_team).toLowerCase();

    let publicOpp: number | null = null;
    if (isHomePick && pb.away != null) publicOpp = pb.away;
    if (isAwayPick && pb.home != null) publicOpp = pb.home;

    if (publicOpp != null && publicOpp >= publicThreshold) {
      items.push({
        game_id: g.game_id,
        game_time: g.game_time,
        league: g.league,
        matchup: `${g.away_team} @ ${g.home_team}`,
        public_pct: publicOpp,
        asg_pick: pr.pick,
        asg_prob: pr.prob,
      });
    }
  }

  // Sort by highest public % fades first
  items.sort((a, b) => (b.public_pct ?? 0) - (a.public_pct ?? 0));
  return NextResponse.json({ items });
}
