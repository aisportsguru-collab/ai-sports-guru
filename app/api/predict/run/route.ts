/**
 * /api/predict/run
 * Pull The Odds API lines, generate predictions (lib/predict),
 * and upsert into Supabase (conflict-safe, auto-fallback).
 */
import { NextResponse } from "next/server";
export const runtime = "nodejs";

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { predict } from "../../../../lib/predict";

// ===== Types =====
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
        name: string; // team or Over/Under
        price?: number; // american odds
        point?: number; // spread/total number
      }>;
    }>;
  }>;
};

type NormalGame = {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  markets?: {
    spread?: number;
    total?: number;
    ml?: { home?: number; away?: number };
    spreadPrices?: { home?: number; away?: number };
    totalPrices?: { over?: number; under?: number };
  };
};

// ===== Helpers =====
const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

function toLeagueParam(v?: string | null) {
  const k = (v || "").toLowerCase();
  if (k === "nfl" || k === "ncaaf" || k === "mlb") return k;
  return "nfl";
}

// The Odds API v4 sport keys
function oddsSportKey(league: string): string {
  switch (league) {
    case "nfl":
      return "americanfootball_nfl";
    case "ncaaf":
      return "americanfootball_ncaaf";
    case "mlb":
      return "baseball_mlb";
    default:
      return "americanfootball_nfl";
  }
}

function startRange(days: number) {
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400 * 1000);
  from.setUTCSeconds(0, 0);
  to.setUTCSeconds(0, 0);
  return { from, to };
}

function pickBestBook(game: OddsAPIGame) {
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
        for (const o of m.outcomes) {
          if (o.name === g.home_team) mlHome = o.price;
          if (o.name === g.away_team) mlAway = o.price;
        }
      } else if (m.key === "spreads") {
        for (const o of m.outcomes) {
          if (o.name === g.home_team) {
            spread = o.point;
            sHomePrice = o.price;
          } else if (o.name === g.away_team) {
            sAwayPrice = o.price;
            // if spread not set from home yet, derive home spread sign
            if (spread === undefined && typeof o.point === "number") {
              spread = -o.point;
            }
          }
        }
      } else if (m.key === "totals") {
        for (const o of m.outcomes) {
          const nm = o.name.toLowerCase();
          if (nm === "over") {
            if (typeof o.point === "number") total = o.point;
            overPrice = o.price;
          } else if (nm === "under") {
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

function modelRow(league: string, ng: NormalGame, picks: Awaited<ReturnType<typeof predict>>) {
  const rel = picks.filter(
    p =>
      p.league === league &&
      p.homeTeam === ng.homeTeam &&
      p.awayTeam === ng.awayTeam &&
      p.kickoffISO === ng.kickoffISO
  );
  const byMarket = (m: "SPREAD" | "ML" | "TOTAL") => rel.find(x => x.market === m);

  const ml = byMarket("ML");
  const sp = byMarket("SPREAD");
  const tot = byMarket("TOTAL");

  const kick = new Date(ng.kickoffISO);
  const game_date = kick.toISOString().slice(0, 10);
  const season = kick.getUTCFullYear();

  const external_id = md5(`${league}|${ng.homeTeam}|${ng.awayTeam}|${ng.kickoffISO}`);

  const pick_moneyline = ml?.pick === "HOME" ? "HOME" : ml?.pick === "AWAY" ? "AWAY" : null;
  const pick_spread =
    typeof sp?.line === "number" && sp?.pick
      ? `${sp.pick === "HOME" ? "HOME" : "AWAY"} ${sp.line >= 0 ? "+" : ""}${sp.line}`
      : null;
  const pick_total =
    typeof tot?.line === "number" && tot?.pick
      ? `${tot.pick === "OVER" ? "Over" : "Under"} ${tot.line}`
      : null;

  const conf_moneyline = ml?.edgePct != null ? Math.round(ml.edgePct) : 55;
  const conf_spread = sp?.edgePct != null ? Math.round(sp.edgePct) : 55;
  const conf_total = tot?.edgePct != null ? Math.round(tot.edgePct) : 55;

  const predicted_winner =
    pick_moneyline === "HOME" ? ng.homeTeam : pick_moneyline === "AWAY" ? ng.awayTeam : null;

  const model_confidence = Math.max(conf_moneyline, conf_spread, conf_total);

  return {
    external_id,
    sport: league,
    commence_time: ng.kickoffISO,
    game_date,
    season,
    home_team: ng.homeTeam,
    away_team: ng.awayTeam,
    moneyline_home: ng.markets?.ml?.home ?? null,
    moneyline_away: ng.markets?.ml?.away ?? null,
    spread_line: ng.markets?.spread ?? null,
    spread_price_home: ng.markets?.spreadPrices?.home ?? null,
    spread_price_away: ng.markets?.spreadPrices?.away ?? null,
    total_line: ng.markets?.total ?? null,
    total_over_price: ng.markets?.totalPrices?.over ?? null,
    total_under_price: ng.markets?.totalPrices?.under ?? null,
    pick_moneyline,
    pick_spread,
    pick_total,
    conf_moneyline,
    conf_spread,
    conf_total,
    model_confidence,
    predicted_winner,
    confidence: model_confidence,
    source_tag: "baseline_v1_fallbacks",
    analysis: null,
    created_at: new Date().toISOString(),
  };
}

// ===== External calls =====
async function fetchOdds(league: string, fromISO: string, toISO: string) {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("Missing ODDS_API_KEY at runtime.");
  const region = process.env.ODDS_API_REGION || "us";
  const markets = process.env.ODDS_API_MARKETS || "h2h,spreads,totals";

  const sportKey = oddsSportKey(league);
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", region);
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");

  const resp = await fetch(url.toString(), { next: { revalidate: 15 } });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`The Odds API error: ${resp.status} ${txt}\n`);
  }
  const raw = (await resp.json()) as OddsAPIGame[];

  // API returns upcoming; filter to our window
  const lo = new Date(fromISO).getTime();
  const hi = new Date(toISO).getTime();
  return raw.filter(g => {
    const t = new Date(g.commence_time).getTime();
    return t >= lo && t <= hi;
  });
}

// robust upsert that matches either unique definition: (external_id,sport) OR (external_id)
async function upsertRows(rows: any[]) {
  const url = process.env.SUPABASE_URL;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    null;

  if (!url || !service) {
    return { count: 0, error: "Supabase env not configured on server (SUPABASE_URL / SUPABASE_SERVICE_ROLE[_KEY])." };
  }

  // de-dupe our payload so ON CONFLICT never hits the same row twice
  const uniq = new Map<string, any>();
  for (const r of rows) {
    if (r.season == null && r.commence_time) {
      const y = new Date(r.commence_time).getUTCFullYear();
      r.season = Number.isFinite(y) ? y : null;
    }
    const key = `${r.external_id}:${r.sport}`;
    uniq.set(key, r);
  }
  const finalRows = Array.from(uniq.values());
  if (!finalRows.length) return { count: 0, error: null };

  const supa = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  // try (external_id,sport) first, then fall back to (external_id)
  const tryUpsert = async (onConflict: string) => {
    return supa
      .from("ai_research_predictions")
      .upsert(finalRows, { onConflict, ignoreDuplicates: false })
      .select("external_id", { count: "exact", head: true });
  };

  let { error, count } = await tryUpsert("external_id,sport");
  if (error) {
    const msg = String(error.message || error);
    if (/duplicate key value violates unique constraint/i.test(msg) ||
        /ON CONFLICT DO UPDATE command cannot affect row a second time/i.test(msg) ||
        /there is no unique or exclusion constraint matching/i.test(msg)) {
      const second = await tryUpsert("external_id");
      error = second.error as any;
      count = second.count ?? count;
    }
  }

  return { count: count ?? 0, error: (error as any)?.message || null };
}

// ===== Route =====
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const league = toLeagueParam(searchParams.get("league"));
    const days = Math.max(1, Math.min(14, parseInt(searchParams.get("days") || "14", 10)));
    const store = Number(searchParams.get("store") || "0") === 1;
    const debug = Number(searchParams.get("debug") || "0") === 1;

    const { from, to } = startRange(days);
    const fromISO = from.toISOString();
    const toISO = to.toISOString();

    const raw = await fetchOdds(league, fromISO, toISO);
    const games = raw.map(g => normalizeGame(league, g));
    const picks = await predict(games);
    const rows = games.map(g => modelRow(league, g, picks));

    let stored = 0;
    let insert_error: string | null = null;
    if (store && rows.length) {
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
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
