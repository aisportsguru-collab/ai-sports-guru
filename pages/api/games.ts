import type { NextApiRequest, NextApiResponse } from "next";

/** Leagues we support */
type League = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab" | "wnba";

/** The mobile Game shape you already use on NFL */
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

/** Odds API v4 sport keys by league */
const SPORT_KEY: Record<League, string> = {
  nfl:   "americanfootball_nfl",
  nba:   "basketball_nba",
  mlb:   "baseball_mlb",
  nhl:   "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  wnba:  "basketball_wnba",
};

type OddsOutcome = { name: string; price?: number; point?: number | null };
type OddsMarket  = { key: "h2h" | "spreads" | "totals"; outcomes?: OddsOutcome[] };
type OddsBook    = { key: string; title?: string; markets?: OddsMarket[] };
type OddsEvent   = {
  id: string;
  commence_time: string; // ISO from provider
  home_team: string;
  away_team: string;
  bookmakers?: OddsBook[];
};

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

function asGame(league: League, ev: OddsEvent): Game {
  const book = pickBook(ev);
  const bookName = book?.title || book?.key || "book";
  const h2h = findMarket(book, "h2h");
  const sp  = findMarket(book, "spreads");
  const tot = findMarket(book, "totals");

  // Moneyline
  const moneyline: Game["odds"]["moneyline"] | undefined = h2h?.outcomes?.length
    ? {
        home: h2h.outcomes?.find(o => o.name === ev.home_team)?.price,
        away: h2h.outcomes?.find(o => o.name === ev.away_team)?.price,
        book: bookName,
      }
    : undefined;

  // Spread
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

  // Total
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
  try {
    const leagueParam = String(req.query.league || "").toLowerCase() as League;
    const allowed: League[] = ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"];
    if (!allowed.includes(leagueParam)) {
      return res.status(400).json({ error: `Unsupported league "${leagueParam}"` });
    }

    const from = String(req.query.from || "");
    const to   = String(req.query.to   || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
    }

    const start = new Date(from + "T00:00:00Z").getTime();
    const end   = new Date(to   + "T23:59:59Z").getTime();

    const events = await fetchOdds(leagueParam);
    const filtered = events.filter((e) => {
      const t = Date.parse(e.commence_time);
      return Number.isFinite(t) && t >= start && t <= end;
    });
    const games: Game[] = filtered.map((e) => asGame(leagueParam, e));

    return res.status(200).json({
      meta: { league: leagueParam, from, to, count: games.length, source: "fresh" },
      data: games,
    });
  } catch (err: any) {
    const league = String(req.query.league || "").toLowerCase();
    const from = String(req.query.from || "");
    const to   = String(req.query.to   || "");
    return res.status(200).json({
      meta: { league, from, to, count: 0, source: "error", error: err?.message || "server_error" },
      data: [],
    });
  }
}
