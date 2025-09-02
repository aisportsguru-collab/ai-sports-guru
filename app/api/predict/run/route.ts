/**
 * /api/predict/run
 * Pull lines from The Odds API, generate predictions (lib/predict),
 * and (optionally) store into Supabase with a conflict-safe upsert.
 */
import { NextResponse } from "next/server";

// Ensure Node runtime (Edge can't see server-side envs reliably)
export const runtime = "nodejs";

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ---- Import your model runner (already in the repo) ----
import { predict } from "../../../lib/predict";

// ---------- Types ----------
type OddsAPIGame = {
  id: string;
  sport_key: string;
  commence_time: string; // ISO
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: "h2h" | "spreads" | "totals";
      outcomes: Array<{
        name: string; // "Home Team", "Away Team" for h2h; "Over"/"Under"; or team names for spreads
        price?: number; // american odds
        point?: number; // spread or total points
      }>;
    }>;
  }>;
};

// The compact shape lib/predict expects (see lib/predict.ts)
type NormalGame = {
  league: "nfl" | "ncaaf" | "mlb" | string;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  markets?: {
    spread?: number;                 // Home spread line (negative if home favored)
    total?: number;                  // Total points
    ml?: { home?: number; away?: number }; // American prices for home/away
    spreadPrices?: { home?: number; away?: number }; // vig for the spread side
    totalPrices?: { over?: number; under?: number }; // vig for totals
  };
};

// ---------- Helpers ----------
function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex");
}

function toLeagueParam(input?: string | null) {
  const v = (input || "").toLowerCase();
  if (v === "nfl" || v === "ncaaf" || v === "mlb") return v;
  return "nfl";
}

function startRange(days: number) {
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400 * 1000);
  // Truncate seconds for stability
  from.setUTCSeconds(0, 0);
  to.setUTCSeconds(0, 0);
  return { from, to };
}

function pickBestBook(game: OddsAPIGame) {
  // 1) Prefer Pinnacle, then Circa, then the first
  const order = ["pinnacle", "circa", "draftkings", "fanduel"];
  const byKey = new Map(game.bookmakers.map(b => [b.key.toLowerCase(), b]));
  for (const k of order) {
    const b = byKey.get(k);
    if (b) return b;
  }
  return game.bookmakers[0] || null;
}

function normalizeGame(league: string, g: OddsAPIGame): NormalGame {
  const book = pickBestBook(g);
  let mlHome: number | undefined;
  let mlAway: number | undefined;
  let spread: number | undefined;
  let sHomePrice: number | undefined;
  let sAwayPrice: number | undefined;
  let total: number | undefined;
  let overPrice: number | undefined;
  let underPrice: number | undefined;

  if (book) {
    for (const m of book.markets || []) {
      if (m.key === "h2h") {
        // outcomes named as team names
        for (const o of m.outcomes) {
          if (o.name === g.home_team) mlHome = o.price;
          if (o.name === g.away_team) mlAway = o.price;
        }
      } else if (m.key === "spreads") {
        // Outcomes for spread typically team-named with point=team spread
        for (const o of m.outcomes) {
          if (o.name === g.home_team) {
            spread = o.point; // home spread (negative means home fav)
            sHomePrice = o.price;
          }
          if (o.name === g.away_team) {
            // keep away price too (line already captured from home side)
            sAwayPrice = o.price;
            // if we didn't see a home point, derive from away
            if (spread === undefined && typeof o.point === "number") {
              spread = -o.point;
            }
          }
        }
      } else if (m.key === "totals") {
        for (const o of m.outcomes) {
          if (o.name.toLowerCase() === "over") {
            if (typeof o.point === "number") total = o.point;
            overPrice = o.price;
          } else if (o.name.toLowerCase() === "under") {
            if (typeof o.point === "number" && total === undefined) total = o.point;
            underPrice = o.price;
          }
        }
      }
    }
  }

  const kickoffISO = new Date(g.commence_time).toISOString();
  return {
    league,
    homeTeam: g.home_team,
    awayTeam: g.away_team,
    kickoffISO,
    markets: {
      spread,
      total,
      ml: { home: mlHome, away: mlAway },
      spreadPrices: { home: sHomePrice, away: sAwayPrice },
      totalPrices: { over: overPrice, under: underPrice },
    },
  };
}

function modelPicksToRow(league: string, ng: NormalGame, picks: Awaited<ReturnType<typeof predict>>) {
  // pull the three relevant picks for this game
  // pick set is a flat array; filter by (home, away, time)
  const rel = picks.filter(
    p =>
      p.league === league &&
      p.homeTeam === ng.homeTeam &&
      p.awayTeam === ng.awayTeam &&
      p.kickoffISO === ng.kickoffISO
  );

  const lookup = (mkt: "SPREAD" | "ML" | "TOTAL") => rel.find(r => r.market === mkt);

  const ml = lookup("ML");
  const sp = lookup("SPREAD");
  const tot = lookup("TOTAL");

  const kick = new Date(ng.kickoffISO);
  const gameDate = kick.toISOString().slice(0, 10);
  const season = kick.getUTCFullYear();

  // Snapshot odds into DB field names
  const moneyline_home = ng.markets?.ml?.home ?? null;
  const moneyline_away = ng.markets?.ml?.away ?? null;
  const spread_line = ng.markets?.spread ?? null;
  const spread_price_home = ng.markets?.spreadPrices?.home ?? null;
  const spread_price_away = ng.markets?.spreadPrices?.away ?? null;
  const total_line = ng.markets?.total ?? null;
  const total_over_price = ng.markets?.totalPrices?.over ?? null;
  const total_under_price = ng.markets?.totalPrices?.under ?? null;

  // Build deterministic external_id
  const external_id = md5(`${league}|${ng.homeTeam}|${ng.awayTeam}|${ng.kickoffISO}`);

  // Format picks like your earlier rows
  const pick_moneyline = ml?.pick === "HOME" ? "HOME" : ml?.pick === "AWAY" ? "AWAY" : null;
  const pick_spread =
    typeof sp?.line === "number" && sp?.pick
      ? `${sp.pick === "HOME" ? "HOME" : "AWAY"} ${sp.line >= 0 ? "+" : ""}${sp.line}`
      : null;
  const pick_total =
    typeof tot?.line === "number" && tot?.pick
      ? `${tot.pick === "OVER" ? "Over" : "Under"} ${tot.line}`
      : null;

  // Confidence fields (coerce to ints, provide defaults)
  const conf_moneyline = ml?.edgePct != null ? Math.round(ml.edgePct) : 55;
  const conf_spread = sp?.edgePct != null ? Math.round(sp.edgePct) : 55;
  const conf_total = tot?.edgePct != null ? Math.round(tot.edgePct) : 55;

  const predicted_winner =
    pick_moneyline === "HOME" ? ng.homeTeam : pick_moneyline === "AWAY" ? ng.awayTeam : null;

  const model_confidence = Math.max(conf_moneyline, conf_spread, conf_total);
  const confidence = model_confidence;

  return {
    // conflict key
    external_id,
    sport: league,
    // times
    commence_time: ng.kickoffISO,
    game_date: gameDate,
    season,
    // teams
    home_team: ng.homeTeam,
    away_team: ng.awayTeam,
    // odds snapshot
    moneyline_home,
    moneyline_away,
    spread_line,
    spread_price_home,
    spread_price_away,
    total_line,
    total_over_price,
    total_under_price,
    // model picks
    pick_moneyline,
    pick_spread,
    pick_total,
    conf_moneyline,
    conf_spread,
    conf_total,
    model_confidence,
    predicted_winner,
    confidence,
    // bookkeeping
    source_tag: "baseline_v1_fallbacks",
    analysis: null,
    created_at: new Date().toISOString(),
  };
}

async function fetchOdds(league: string, fromISO: string, toISO: string) {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("Missing ODDS_API_KEY at runtime.");

  const region = process.env.ODDS_API_REGION || "us";
  const markets = process.env.ODDS_API_MARKETS || "h2h,spreads,totals";
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${league}/odds/`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", region);
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  // The v4 odds endpoint returns upcoming; we’ll filter locally to [from,to]
  const resp = await fetch(url.toString(), { next: { revalidate: 15 } });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`The Odds API error: ${resp.status} ${text}`);
  }
  const raw = (await resp.json()) as OddsAPIGame[];
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  const filtered = raw.filter(g => {
    const t = new Date(g.commence_time).getTime();
    return t >= from && t <= to;
  });
  return filtered;
}

// Safe upsert with de-duplication by (external_id,sport)
async function upsertRows(rows: any[]) {
  const url = process.env.SUPABASE_URL;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.toString();

  if (!url || !service) {
    return { count: 0, error: "Supabase env not configured on server (SUPABASE_URL / SUPABASE_SERVICE_ROLE[_KEY])." };
  }

  // de-dup by exact conflict key
  const uniq = new Map<string, any>();
  for (const r of rows) {
    const key = `${r.external_id}:${r.sport}`;
    // soft-fill season in case it wasn't set
    if (r.season == null && r.commence_time) {
      const y = new Date(r.commence_time).getUTCFullYear();
      r.season = Number.isFinite(y) ? y : null;
    }
    uniq.set(key, r);
  }
  const finalRows = Array.from(uniq.values());
  if (finalRows.length === 0) return { count: 0, error: null };

  const supa = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error, count } = await supa
    .from("ai_research_predictions")
    .upsert(finalRows, { onConflict: "external_id,sport", ignoreDuplicates: false })
    .select("external_id", { count: "exact", head: true });

  return { count: count ?? 0, error: error?.message || null };
}

// ---------- Route ----------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const league = toLeagueParam(searchParams.get("league"));
    const days = Math.max(1, Math.min(14, parseInt(searchParams.get("days") || "14", 10)));
    const store = parseInt(searchParams.get("store") || "0", 10) === 1 ? 1 : 0;
    const debug = parseInt(searchParams.get("debug") || "0", 10) === 1 ? 1 : 0;

    const { from, to } = startRange(days);
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    // 1) Pull odds
    const raw = await fetchOdds(league, fromISO, toISO);

    // 2) Normalize for the model
    const games: NormalGame[] = raw.map(g => normalizeGame(league, g));

    // 3) Call your model
    const picks = await predict(games);

    // 4) Build DB rows
    const rows = games.map(g => modelPicksToRow(league, g, picks));

    // 5) Optional store
    let stored = 0;
    let insert_error: string | null = null;
    if (store === 1 && rows.length > 0) {
      const res = await upsertRows(rows);
      stored = res.count || 0;
      insert_error = res.error;
    }

    const body: any = {
      ok: true,
      league,
      from: fromISO,
      to: toISO,
      stored,
      note: "Pulled odds from The Odds API and generated predictions.",
    };
    if (insert_error) body.insert_error = insert_error;
    if (debug) {
      body.debug = {
        used_service_role:
          process.env.SUPABASE_SERVICE_ROLE_KEY
            ? "SUPABASE_SERVICE_ROLE_KEY"
            : process.env.SUPABASE_SERVICE_ROLE
            ? "SUPABASE_SERVICE_ROLE"
            : "NONE",
        sample: rows[0],
      };
    }

    return NextResponse.json(body);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
