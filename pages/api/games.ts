import type { NextApiRequest, NextApiResponse } from "next";

/** Supported leagues */
type League = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab" | "wnba";

/** Game shape consumed by app */
type Game = {
  id: string;
  league: League;
  kickoffISO: string; // from commence_time (UTC ISO)
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
};

type OddsOutcome = { name: string; price?: number; point?: number | null };
type OddsMarket  = { key: "h2h" | "spreads" | "totals"; outcomes?: OddsOutcome[] };
type OddsBook    = { key: string; title?: string; markets?: OddsMarket[] };
type OddsEvent   = {
  id: string;
  commence_time: string; // ISO
  home_team: string;
  away_team: string;
  bookmakers?: OddsBook[];
};

/** The Odds API sport keys */
const SPORT_KEY: Record<League, string> = {
  nfl:   "americanfootball_nfl",
  nba:   "basketball_nba",
  mlb:   "baseball_mlb",
  nhl:   "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  wnba:  "basketball_wnba",
};

const ALLOWED: League[] = ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"];

function normLeague(input: unknown): League | null {
  const key = String(input ?? "").trim().toLowerCase() as League;
  return (ALLOWED as string[]).includes(key) ? (key as League) : null;
}

function pickBook(e: OddsEvent) {
  const books = e.bookmakers || [];
  return (
    books.find(b => b.key === "draftkings" || /draftkings/i.test(b.title || "")) ||
    books[0]
  );
}

function findMarket(book: OddsBook | undefined, key: OddsMarket["key"]) {
  return book?.markets?.find(m => m.key === key);
}

function toGame(league: League, ev: OddsEvent): Game {
  const book = pickBook(ev);
  const bookName = book?.title || book?.key || "book";
  const h2h = findMarket(book, "h2h");
  const sp  = findMarket(book, "spreads");
  const tot = findMarket(book, "totals");

  const moneyline: Game["odds"]["moneyline"] | undefined = h2h?.outcomes?.length
    ? {
        home: h2h.outcomes?.find(o => o.name === ev.home_team)?.price,
        away: h2h.outcomes?.find(o => o.name === ev.away_team)?.price,
        book: bookName,
      }
    : undefined;

  let spread: Game["odds"]["spread"] | undefined;
  if (sp?.outcomes?.length) {
    const homeO = sp.outcomes.find(o => o.name === ev.home_team);
    const awayO = sp.outcomes.find(o => o.name === ev.away_team);
    const home = homeO?.point != null && homeO?.price != null
      ? { point: Number(homeO.point), price: Number(homeO.price) }
      : undefined;
    const away = awayO?.point != null && awayO?.price != null
      ? { point: Number(awayO.point), price: Number(awayO.price) }
      : undefined;
    if (home || away) spread = { home, away, book: bookName };
  }

  let total: Game["odds"]["total"] | undefined;
  if (tot?.outcomes?.length) {
    const overO  = tot.outcomes.find(o => typeof o.name === "string" && /^over$/i.test(o.name));
    const underO = tot.outcomes.find(o => typeof o.name === "string" && /^under$/i.test(o.name));
    const over  = overO?.point != null && overO?.price != null
      ? { point: Number(overO.point),  price: Number(overO.price) }
      : undefined;
    const under = underO?.point != null && underO?.price != null
      ? { point: Number(underO.point), price: Number(underO.price) }
      : undefined;
    if (over || under) total = { over, under, book: bookName };
  }

  return {
    id: String(ev.id),
    league,
    kickoffISO: new Date(ev.commence_time).toISOString(),
    home: ev.home_team,
    away: ev.away_team,
    odds: { moneyline, spread, total },
  };
}

async function fetchOdds(league: League): Promise<OddsEvent[]> {
  const sport = SPORT_KEY[league];
  const base =
    (process.env.ODDS_API_BASE?.replace(/\/+$/, "")) ||
    "https://api.the-odds-api.com/v4/sports";
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("Missing ODDS_API_KEY");

  const url =
    `${base}/${encodeURIComponent(sport)}/odds/` +
    `?apiKey=${encodeURIComponent(key)}` +
    `&regions=us&oddsFormat=american&markets=h2h,spreads,totals&bookmakers=draftkings`;

  const r = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 0 } });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Odds API failed (${r.status}): ${text.slice(0,300)}`);
  }
  return (await r.json()) as OddsEvent[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const league = normLeague(req.query.league);
  const fromRaw = String(req.query.from ?? "").trim();
  const toRaw   = String(req.query.to   ?? "").trim();

  // Normalize YYYY-MM-DD safely
  const from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : "";
  const to   = /^\d{4}-\d{2}-\d{2}$/.test(toRaw)   ? toRaw   : "";

  // Always respond with JSON + meta, even on param errors
  if (!league) {
    return res.status(200).json({
      meta: { league: String(req.query.league || "unknown"), from, to, count: 0, source: "error", error: "unsupported_league" },
      data: [],
    });
  }
  if (!from || !to) {
    return res.status(200).json({
      meta: { league, from, to, count: 0, source: "error", error: "invalid_dates" },
      data: [],
    });
  }

  try {
    const start = new Date(from + "T00:00:00Z").getTime();
    const end   = new Date(to   + "T23:59:59Z").getTime();

    const events = await fetchOdds(league);
    const filtered = events.filter((e) => {
      const t = Date.parse(e.commence_time);
      return Number.isFinite(t) && t >= start && t <= end;
    });
    const games: Game[] = filtered.map((e) => toGame(league, e));

    return res.status(200).json({
      meta: { league, from, to, count: games.length, source: "fresh" },
      data: games,
    });
  } catch (err: any) {
    return res.status(200).json({
      meta: { league, from, to, count: 0, source: "error", error: err?.message || "server_error" },
      data: [],
    });
  }
}
