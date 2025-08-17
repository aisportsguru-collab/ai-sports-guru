import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type Game = {
  id: string;
  league: "nfl";
  kickoffISO: string;
  home: string;
  away: string;
  odds: {
    moneyline?: { home?: number; away?: number; book?: string };
    spread?: {
      home?: { point: number; price: number };
      away?: { point: number; price: number };
      book?: string;
    };
    total?: {
      over?: { point: number; price: number };
      under?: { point: number; price: number };
      book?: string;
    };
  };
  predictions?: {
    moneyline?: { pick: "HOME" | "AWAY"; confidencePct: number };
    spread?: { pick: "HOME" | "AWAY"; line: number; confidencePct: number };
    total?: { pick: "OVER" | "UNDER"; line: number; confidencePct: number };
  };
};

type OddsApiOutcome = { name: string; price: number; point?: number };
type OddsApiMarket = { key: "h2h" | "spreads" | "totals"; outcomes: OddsApiOutcome[] };
type OddsApiBookmaker = { key: string; markets: OddsApiMarket[] };
type OddsApiEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ODDS_API_KEY = process.env.ODDS_API_KEY!;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const CACHE_TTL_SECONDS = 15 * 60;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseDateOnlyUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function withinWindowUTC(iso: string, from: Date, toExclusive: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < toExclusive.getTime();
}

function pickBestBook(bookmakers: OddsApiBookmaker[] | undefined): OddsApiBookmaker | undefined {
  if (!bookmakers || bookmakers.length === 0) return undefined;

  const scored = bookmakers.map((b) => {
    const keys = new Set(b.markets?.map((m) => m.key) ?? []);
    const hasAll = keys.has("h2h") && keys.has("spreads") && keys.has("totals");
    const priority =
      b.key.toLowerCase().includes("draftkings") || b.key.toLowerCase().includes("pinnacle") ? 1 : 2;
    return { b, hasAll, marketsCount: keys.size, priority };
  });

  const withAll = scored.filter((s) => s.hasAll);
  if (withAll.length) {
    withAll.sort((a, b) => a.priority - b.priority);
    return withAll[0].b;
  }

  scored.sort((a, b) => {
    if (b.marketsCount !== a.marketsCount) return b.marketsCount - a.marketsCount;
    return a.priority - b.priority;
  });
  return scored[0].b;
}

function flattenToGame(e: OddsApiEvent): Game {
  const bm = pickBestBook(e.bookmakers);
  const odds: Game["odds"] = {};

  if (bm) {
    const getMarket = (key: "h2h" | "spreads" | "totals") =>
      bm.markets?.find((m) => m.key === key);

    const h2h = getMarket("h2h");
    if (h2h) {
      const homeML = h2h.outcomes.find((o) => o.name === e.home_team)?.price;
      const awayML = h2h.outcomes.find((o) => o.name === e.away_team)?.price;
      odds.moneyline = { home: homeML, away: awayML, book: bm.key };
    }

    const spreads = getMarket("spreads");
    if (spreads) {
      const homeS = spreads.outcomes.find((o) => o.name === e.home_team);
      const awayS = spreads.outcomes.find((o) => o.name === e.away_team);
      odds.spread = {
        home: homeS && homeS.point != null && homeS.price != null ? { point: homeS.point, price: homeS.price } : undefined,
        away: awayS && awayS.point != null && awayS.price != null ? { point: awayS.point, price: awayS.price } : undefined,
        book: bm.key,
      };
    }

    const totals = getMarket("totals");
    if (totals) {
      const over = totals.outcomes.find((o) => o.name.toLowerCase() === "over");
      const under = totals.outcomes.find((o) => o.name.toLowerCase() === "under");
      odds.total = {
        over: over && over.point != null && over.price != null ? { point: over.point, price: over.price } : undefined,
        under: under && under.point != null && under.price != null ? { point: under.point, price: under.price } : undefined,
        book: bm.key,
      };
    }
  }

  const g: Game = {
    id: e.id,
    league: "nfl",
    kickoffISO: e.commence_time,
    home: e.home_team,
    away: e.away_team,
    odds,
  };
  return g;
}

async function fetchOddsRawNFL(): Promise<OddsApiEvent[]> {
  const url = `${ODDS_API_BASE}/sports/americanfootball_nfl/odds/?apiKey=${encodeURIComponent(
    ODDS_API_KEY
  )}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API error ${res.status}. ${text}`);
  }
  const data = (await res.json()) as OddsApiEvent[];
  return Array.isArray(data) ? data : [];
}

function buildCacheKey(league: string, from: string, to: string) {
  return `games:${league}:${from}:${to}`;
}

async function getCache(cacheKey: string): Promise<Game[] | null> {
  const { data, error } = await supabase
    .from("odds_cache")
    .select("data, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (error || !data) return null;
  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() >= expiresAt) return null;
  return (data.data as Game[]) ?? null;
}

async function setCache(cacheKey: string, payload: Game[]) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString();
  await supabase
    .from("odds_cache")
    .upsert({ cache_key: cacheKey, data: payload, expires_at: expiresAt }, { onConflict: "cache_key" });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const league = String(req.query.league || "nfl").toLowerCase();
    const fromStr = String(req.query.from || "");
    const toStr = String(req.query.to || "");

    if (league !== "nfl") {
      return res.status(400).json({ error: "Only league nfl is supported here" });
    }
    if (!fromStr || !toStr) {
      return res.status(400).json({ error: "from and to are required in YYYY MM DD" });
    }

    const fromUTC = parseDateOnlyUTC(fromStr);
    const toUTCExclusive = parseDateOnlyUTC(toStr);

    const cacheKey = buildCacheKey(league, fromStr, toStr);
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ data: cached, meta: { league, from: fromStr, to: toStr, source: "cache" } });
    }

    const raw = await fetchOddsRawNFL();
    const normalized = raw.map(flattenToGame);
    const filtered = normalized.filter((g) => withinWindowUTC(g.kickoffISO, fromUTC, toUTCExclusive));

    await setCache(cacheKey, filtered);

    return res.status(200).json({
      data: filtered,
      meta: { league, from: fromStr, to: toStr, count: filtered.length, source: "fresh" },
    });
  } catch (err: any) {
    console.error("GET /api/games error", err);
    return res.status(500).json({ error: "Internal error", detail: String(err?.message || err) });
  }
}
