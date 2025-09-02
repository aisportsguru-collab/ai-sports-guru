import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabaseServer } from "../db/supabaseServer";

export type FadeRow = {
  game_id: string;
  league: string;
  start_time: string;
  home_team_id: string;
  away_team_id: string;
  public_home: number; // 0..1
  public_away: number; // 0..1
  model_home_prob: number; // 0..1
  model_away_prob: number; // 0..1
  fade_side: "HOME" | "AWAY";
  edge: number; // model minus public on the chosen fade side
};

/** Try to read a value using any of the provided keys, else undefined */
function pick<T extends Record<string, any>>(row: T, keys: string[]) {
  for (const k of keys) if (k in row && row[k] != null) return row[k];
  return undefined;
}

function asPct(v: any): number | undefined {
  if (v == null) return;
  const n = Number(v);
  if (Number.isNaN(n)) return;
  // Accept 0..1 or 0..100
  return n > 1 ? n / 100 : n;
}

export async function getFades(league: string, days = 7): Promise<FadeRow[]> {
  const sb = supabaseServer();

  // ---- 1) Odds with public % (flexible column discovery)
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const oddsSel = "*";
  const { data: odds, error: oddsErr } = await sb
    .from("odds")
    .select(oddsSel)
    .eq("league", league)
    .gte("start_time", since);

  if (oddsErr) throw oddsErr;
  if (!odds || odds.length === 0) return [];

  // ---- 2) Latest model predictions (use your existing endpoint storage)
  // Prefer reading from DB table `model_predictions` if present; fallback to /api/predict/latest
  let preds: any[] = [];
  const mp = await sb.from("model_predictions").select("*").eq("league", league).order("as_of", { ascending: false }).limit(2000);
  if (!mp.error && mp.data?.length) {
    preds = mp.data;
  } else {
    // Fallback to internal API (works on Vercel + local dev)
    try {
      const base =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const url = `${base}/api/predict/latest?league=${encodeURIComponent(league)}&days=${days}`;
      const r = await fetch(url);
      if (r.ok) preds = await r.json();
    } catch {}
  }

  // Index predictions by game_id
  const byGame: Record<string, any> = {};
  for (const p of preds) {
    const gid = pick(p, ["game_id", "id", "event_id"]);
    if (!gid) continue;
    if (!byGame[gid]) byGame[gid] = p;
  }

  const rows: FadeRow[] = [];
  for (const o of odds) {
    const game_id = pick(o, ["game_id", "id", "event_id"]);
    const start_time = pick(o, ["start_time", "commence_time", "game_time"]) || new Date().toISOString();
    const home_team_id = pick(o, ["home_team_id", "home_id", "home_abbr", "home"]);
    const away_team_id = pick(o, ["away_team_id", "away_id", "away_abbr", "away"]);
    const ph = asPct(pick(o, ["public_home", "public_bets_home", "public_pct_home", "handle_home"]));
    const pa = asPct(pick(o, ["public_away", "public_bets_away", "public_pct_away", "handle_away"]));

    if (!game_id || !home_team_id || !away_team_id || ph == null || pa == null) continue;

    // Predictions
    const p = byGame[game_id] || {};
    const mh = Number(pick(p, ["home_win_prob", "prob_home", "home_prob", "home_ml_prob"]));
    const ma = Number(pick(p, ["away_win_prob", "prob_away", "away_prob", "away_ml_prob"]));
    if (!Number.isFinite(mh) || !Number.isFinite(ma)) continue;

    // Fade condition: public >= 0.65 on a side, model likes the other side by >= 0.55
    let fade_side: "HOME" | "AWAY" | null = null;
    let edge = 0;

    if (ph >= 0.65 && ma >= 0.55) {
      fade_side = "AWAY";
      edge = ma - ph; // model for AWAY minus public on HOME
    } else if (pa >= 0.65 && mh >= 0.55) {
      fade_side = "HOME";
      edge = mh - pa; // model for HOME minus public on AWAY
    }

    if (fade_side) {
      rows.push({
        game_id: String(game_id),
        league,
        start_time: new Date(start_time).toISOString(),
        home_team_id: String(home_team_id),
        away_team_id: String(away_team_id),
        public_home: ph,
        public_away: pa,
        model_home_prob: mh,
        model_away_prob: ma,
        fade_side,
        edge,
      });
    }
  }

  // Sort by biggest contrarian edge first, then soonest
  return rows
    .sort((a, b) => (Math.abs(b.edge) - Math.abs(a.edge)) || (Date.parse(a.start_time) - Date.parse(b.start_time)));
}
