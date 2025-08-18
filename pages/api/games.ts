import type { NextApiRequest, NextApiResponse } from "next";

/** Supported leagues */
type League = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "wnba" | "ncaab";

/** The Odds API sport keys */
const SPORT_KEY: Record<League, string> = {
  nfl:   "americanfootball_nfl",
  nba:   "basketball_nba",
  mlb:   "baseball_mlb",
  nhl:   "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  wnba:  "basketball_wnba",
  ncaab: "basketball_ncaab",
};

type OddsApiOutcome = { name: string; price: number; point?: number | null };
type OddsApiMarket = { key: string; outcomes: OddsApiOutcome[] };
type OddsApiBookmaker = { key: string; title: string; markets: OddsApiMarket[] };
type OddsApiEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
};

/** Unified Game shape your mobile/web UI already consumes */
type Game = {
  id: string;
  league: League;
  kickoff_iso: string;
  home: string;
  away: string;
  odds: {
    moneyline?: {
      home?: { price: number; book: string };
      away?: { price: number; book: string };
    };
    spread?: {
      home?: { line: number; price: number; book: string };
      away?: { line: number; price: number; book: string };
    };
    total?: {
      over?: { line: number; price: number; book: string };
      under?: { line: number; price: number; book: string };
    };
  };
};

/** Pick DraftKings if present, otherwise first book */
function pickBook(e: OddsApiEvent) {
  return (
    e.bookmakers.find((b) => b.key === "draftkings" || /draftkings/i.test(b.title)) ||
    e.bookmakers[0]
  );
}

function findMarket(book: OddsApiBookmaker | undefined, key: string) {
  return book?.markets.find((m) => m.key === key);
}

function asGame(league: League, e: OddsApiEvent): Game {
  const book = pickBook(e);
  const h2h = findMarket(book, "h2h");
  const spreads = findMarket(book, "spreads");
  const totals = findMarket(book, "totals");

  // Moneyline
  const ml: Game["odds"]["moneyline"] = {};
  if (h2h?.outcomes?.length) {
    for (const o of h2h.outcomes) {
      if (o.name === e.home_team) ml.home = { price: o.price, book: book?.title || "" };
      if (o.name === e.away_team) ml.away = { price: o.price, book: book?.title || "" };
    }
  }

  // Spread
  const sp: Game["odds"]["spread"] = {};
  if (spreads?.outcomes?.length) {
    for (const o of spreads.outcomes) {
      if (o.name === e.home_team && o.point != null)
        sp.home = { line: Number(o.point), price: o.price, book: book?.title || "" };
      if (o.name === e.away_team && o.point != null)
        sp.away = { line: Number(o.point), price: o.price, book: book?.title || "" };
    }
  }

  // Total
  const tot: Game["odds"]["total"] = {};
  if (totals?.outcomes?.length) {
    for (const o of totals.outcomes) {
      const isOver = /^over$/i.test(o.name);
      const isUnder = /^under$/i.test(o.name);
      if ((isOver || isUnder) && o.point != null) {
        const entry = { line: Number(o.point), price: o.price, book: book?.title || "" };
        if (isOver) tot.over = entry;
        if (isUnder) tot.under = entry;
      }
    }
  }

  const odds: Game["odds"] = {};
  if (ml.home || ml.away) odds.moneyline = ml;
  if (sp.home || sp.away) odds.spread = sp;
  if (tot.over || tot.under) odds.total = tot;

  return {
    id: e.id,
    league,
    kickoff_iso: new Date(e.commence_time).toISOString(),
    home: e.home_team,
    away: e.away_team,
    odds,
  };
}

async function fetchOdds(league: League): Promise<OddsApiEvent[]> {
  const sport = SPORT_KEY[league];
  const base =
    process.env.ODDS_API_BASE?.replace(/\/+$/, "") ||
    "https://api.the-odds-api.com/v4/sports";
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("Missing ODDS_API_KEY");

  const url =
    `${base}/${encodeURIComponent(sport)}/odds/` +
    `?apiKey=${encodeURIComponent(key)}` +
    `&regions=us&oddsFormat=american` +
    `&markets=h2h,spreads,totals&bookmakers=draftkings`;

  const r = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 0 } });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Odds API failed (${r.status}): ${text.slice(0, 300)}`);
  }
  return (await r.json()) as OddsApiEvent[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const leagueParam = String(req.query.league || "").toLowerCase();
    const league = (["nfl","nba","mlb","nhl","ncaaf","wnba","ncaab"] as const)
      .find((v) => v === (leagueParam as League));
    if (!league) return res.status(400).json({ error: `Unsupported league "${leagueParam}"` });

    const from = String(req.query.from || "");
    const to   = String(req.query.to   || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
    }

    const start = new Date(from + "T00:00:00Z").getTime();
    const end   = new Date(to   + "T23:59:59Z").getTime();

    const events = await fetchOdds(league);
    const filtered = events.filter((e) => {
      const t = Date.parse(e.commence_time);
      return Number.isFinite(t) && t >= start && t <= end;
    });

    const games: Game[] = filtered.map((e) => asGame(league, e));

    return res.status(200).json({
      meta: { league, from, to, count: games.length, source: "fresh" },
      data: games,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "server_error" });
  }
}
