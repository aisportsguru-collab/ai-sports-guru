import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Sport = "mlb" | "nfl" | "nba" | "nhl" | "ncaaf" | "ncaab" | "wnba";

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svc) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY at runtime.");
  }
  _admin = createClient(url, svc, { auth: { persistSession: false } });
  return _admin;
}

const ODDS_API_KEY = process.env.ODDS_API_KEY;

const SPORT_TO_API: Record<Sport, string> = {
  mlb: "baseball_mlb",
  nfl: "americanfootball_nfl",
  nba: "basketball_nba",
  nhl: "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  wnba: "basketball_wnba",
};

export type OddsSnapshot = {
  moneyline_home: number | null;
  moneyline_away: number | null;
  spread_line: number | null;         // home spread (negative favors home)
  spread_price_home: number | null;
  spread_price_away: number | null;
  total_line: number | null;          // O/U number
  total_over_price: number | null;
  total_under_price: number | null;
};

function americanToImplied(american: number): number | null {
  if (american == null) return null;
  if (american < 0) return Math.min(0.99, (-american) / ((-american) + 100));
  return Math.min(0.99, 100 / (american + 100));
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Build a prediction using whatever markets exist.
 * - If ML exists, use implied probs for side and confidence.
 * - Else if Spread exists, use sign of home spread to pick side. Confidence ~ |spread|.
 * - Totals: choose side with higher implied prob (or low edge if prices missing).
 * - If data thin, mark source_tag accordingly and lower confidence.
 */
export function modelFromSnapshot(input: {
  home_team: string;
  away_team: string;
  snapshot: OddsSnapshot;
}) {
  const { home_team, away_team, snapshot: s } = input;

  // Moneyline pick
  let pick_moneyline: "HOME" | "AWAY" | null = null;
  let conf_moneyline: number | null = null;

  const pHome = americanToImplied(s.moneyline_home ?? NaN);
  const pAway = americanToImplied(s.moneyline_away ?? NaN);

  if (pHome != null && pAway != null) {
    pick_moneyline = (pHome >= pAway) ? "HOME" : "AWAY";
    // Confidence map: baseline 50 → 65, add small edge bonus
    const edge = Math.abs(pHome - pAway); // 0..1
    conf_moneyline = Math.round(clamp(50 + 12 * (Math.max(pHome, pAway) - 0.5) + 10 * edge, 52, 68));
  } else if (s.spread_line != null) {
    // Use spread sign when ML is missing (negative favors home)
    pick_moneyline = (s.spread_line < 0) ? "HOME" : "AWAY";
    const spreadMag = Math.min(10, Math.abs(s.spread_line));
    conf_moneyline = Math.round(clamp(52 + spreadMag * 1.2, 52, 64));
  } else {
    // Extreme fallback
    pick_moneyline = "HOME";
    conf_moneyline = 55;
  }

  // Spread pick (only if spread exists)
  let pick_spread: string | null = null;
  let conf_spread: number | null = null;
  if (s.spread_line != null) {
    // Price lean if available
    const pHomeSpread = americanToImplied(s.spread_price_home ?? NaN);
    const pAwaySpread = americanToImplied(s.spread_price_away ?? NaN);
    // Default to favored side by spread sign
    let spreadSide: "HOME" | "AWAY" = s.spread_line < 0 ? "HOME" : "AWAY";
    if (pHomeSpread != null && pAwaySpread != null) {
      spreadSide = pHomeSpread >= pAwaySpread ? "HOME" : "AWAY";
    }
    pick_spread = `${spreadSide} ${spreadSide === "HOME" ? (s.spread_line >= 0 ? "+" : "") + s.spread_line : (s.spread_line >= 0 ? "-" : "+") + Math.abs(s.spread_line)}`;
    const spreadMag = Math.min(10, Math.abs(s.spread_line));
    const juiceAdj = Math.max(pHomeSpread ?? 0.5, pAwaySpread ?? 0.5);
    conf_spread = Math.round(clamp(52 + spreadMag * 1.4 + (juiceAdj - 0.5) * 8, 52, 65));
  }

  // Total pick
  let pick_total: string | null = null;
  let conf_total: number | null = null;
  if (s.total_line != null) {
    const pOver = americanToImplied(s.total_over_price ?? NaN) ?? 0.5;
    const pUnder = americanToImplied(s.total_under_price ?? NaN) ?? 0.5;
    const side = pOver >= pUnder ? "Over" : "Under";
    pick_total = `${side} ${s.total_line}`;
    const edge = Math.abs(pOver - pUnder);
    conf_total = Math.round(clamp(52 + 10 * edge + 4, 52, 64));
  }

  // Aggregate model_confidence = max of available confidences
  const model_confidence = Math.max(conf_moneyline ?? 0, conf_spread ?? 0, conf_total ?? 0, 55);

  // Predicted winner from ML side
  const predicted_winner = pick_moneyline === "HOME" ? home_team
                        : pick_moneyline === "AWAY" ? away_team
                        : null;

  // Source tag for auditing
  let source_tag = "baseline_v2_odds";
  if (pHome == null && pAway == null && s.spread_line == null && s.total_line == null) {
    source_tag = "baseline_v2_no_lines";
  } else if (pHome == null && pAway == null) {
    source_tag = "baseline_v2_partial";
  }

  return {
    pick_moneyline,
    pick_spread,
    pick_total,
    conf_moneyline,
    conf_spread,
    conf_total,
    model_confidence,
    predicted_winner,
    rationale: `Odds-informed baseline: ML=${s.moneyline_home}/${s.moneyline_away}, spread=${s.spread_line}, total=${s.total_line}.`,
    source_tag,
  };
}

function americanFromPrice(price: number | null | undefined) {
  if (price === null || price === undefined) return null;
  return Math.round(price);
}

function buildSnapshot(game: any): OddsSnapshot {
  const all = (game.bookmakers || []).flatMap((b: any) => b.markets || []);
  const mkt = (k: string) => all.find((m: any) => m.key === k);

  const h2h = mkt("h2h");
  let moneyline_home: number | null = null;
  let moneyline_away: number | null = null;
  if (h2h?.outcomes) {
    for (const o of h2h.outcomes) {
      if (o.name === game.home_team) moneyline_home = americanFromPrice(o.price);
      if (o.name === game.away_team) moneyline_away = americanFromPrice(o.price);
    }
  }

  const spreads = mkt("spreads");
  let spread_line: number | null = null;           // home line
  let spread_price_home: number | null = null;
  let spread_price_away: number | null = null;
  if (spreads?.outcomes) {
    for (const o of spreads.outcomes) {
      if (o.name === game.home_team) {
        spread_line = Number(o.point);
        spread_price_home = americanFromPrice(o.price);
      }
      if (o.name === game.away_team) {
        spread_price_away = americanFromPrice(o.price);
      }
    }
  }

  const totals = mkt("totals");
  let total_line: number | null = null;
  let total_over_price: number | null = null;
  let total_under_price: number | null = null;
  if (totals?.outcomes) {
    for (const o of totals.outcomes) {
      const nm = (o.name || "").toUpperCase();
      if (nm === "OVER") {
        total_line = Number(o.point);
        total_over_price = americanFromPrice(o.price);
      }
      if (nm === "UNDER") {
        total_under_price = americanFromPrice(o.price);
      }
    }
  }

  return {
    moneyline_home,
    moneyline_away,
    spread_line,
    spread_price_home,
    spread_price_away,
    total_line,
    total_over_price,
    total_under_price,
  };
}

export async function fetchOdds(sport: Sport) {
  if (!ODDS_API_KEY) throw new Error("Missing ODDS_API_KEY at runtime.");
  const apiSport = SPORT_TO_API[sport];
  const url = new URL("https://api.the-odds-api.com/v4/sports/" + apiSport + "/odds");
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("apiKey", ODDS_API_KEY!);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Odds API status ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.map((g: any) => ({
    id: g.id,
    home_team: g.home_team,
    away_team: g.away_team,
    commence_time: g.commence_time,
    bookmakers: g.bookmakers || [],
  }));
}

function computeSeason(sport: Sport, d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  if (sport === "mlb") return y;
  if (["nfl", "ncaaf", "nba", "nhl", "ncaab", "wnba"].includes(sport)) {
    return m >= 8 ? y : y - 1;
  }
  return y;
}

export async function runPipelineOnce(sport: Sport, dateISO: string) {
  const all = await fetchOdds(sport);
  const rows: any[] = [];

  for (const g of all) {
    // keep same-day (UTC date match) to be deterministic per run
    if (!g.id || !g.commence_time) continue;
    if ((g.commence_time || "").slice(0, 10) !== dateISO) continue;

    const commenceISO = new Date(g.commence_time).toISOString();
    const snap = buildSnapshot(g);
    const season = computeSeason(sport, new Date(commenceISO));

    const model = modelFromSnapshot({
      home_team: g.home_team,
      away_team: g.away_team,
      snapshot: snap,
    });

    rows.push({
      sport,
      game_date: dateISO,
      season,
      external_id: g.id,
      home_team: g.home_team,
      away_team: g.away_team,
      commence_time: commenceISO,

      pick_moneyline: model.pick_moneyline,
      pick_spread: model.pick_spread,
      pick_total: model.pick_total,
      conf_moneyline: model.conf_moneyline,
      conf_spread: model.conf_spread,
      conf_total: model.conf_total,
      model_confidence: model.model_confidence,
      rationale: model.rationale ?? null,
      predicted_winner: model.predicted_winner,

      moneyline_home: snap.moneyline_home,
      moneyline_away: snap.moneyline_away,
      spread_line: snap.spread_line,
      spread_price_home: snap.spread_price_home,
      spread_price_away: snap.spread_price_away,
      total_line: snap.total_line,
      total_over_price: snap.total_over_price,
      total_under_price: snap.total_under_price,

      source_tag: model.source_tag,
    });
  }

  if (!rows.length) return { upserted: 0, note: "No valid games for date" };

  const supabase = getAdmin();
  const { data, error } = await supabase
    .from("ai_research_predictions")
    .upsert(rows, { onConflict: "external_id,sport" })
    .select("external_id");

  if (error) throw error;
  return { upserted: data?.length || 0 };
}

export async function runPipelineRange(sport: Sport, startISO: string, days: number) {
  let total = 0;
  const start = new Date(startISO);
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i));
    const iso = d.toISOString().slice(0, 10);
    const r = await runPipelineOnce(sport, iso);
    total += r.upserted || 0;
  }
  return { upserted: total };
}
