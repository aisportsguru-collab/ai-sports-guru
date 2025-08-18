import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Public contract consumed by the mobile app.
 */
export type Game = {
  id: string;
  league: "nfl" | "nba" | "mlb" | "nhl" | "ncaaf";
  kickoffISO: string; // commence_time (UTC ISO)
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

type OddsApiEvent = {
  id: string;
  commence_time: string; // ISO
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: "h2h" | "spreads" | "totals";
      outcomes: Array<{
        name: string; // team OR "Over"/"Under"
        price: number; // -110, +140
        point?: number; // for spreads/totals
      }>;
    }>;
  }>;
};

// Our leagues -> The Odds API keys
const SPORT_MAP: Record<string, string> = {
  nfl: "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
  nba: "basketball_nba",
  mlb: "baseball_mlb",
  nhl: "icehockey_nhl",
};

const PREFERRED_BOOKS = [
  "draftkings",
  "fanduel",
  "caesars",
  "betmgm",
  "pointsbetus",
  "barstool",
  "williamhill_us",
];

function pickBook(bookmakers: OddsApiEvent["bookmakers"]) {
  if (!Array.isArray(bookmakers) || bookmakers.length === 0) return null;
  for (const key of PREFERRED_BOOKS) {
    const m = bookmakers.find((b) => b.key === key);
    if (m) return m;
  }
  return bookmakers[0] ?? null;
}

function findMarket(
  bm: NonNullable<ReturnType<typeof pickBook>>,
  key: "h2h" | "spreads" | "totals"
) {
  return bm?.markets?.find((m) => m.key === key) ?? null;
}

function asGame(league: Game["league"], e: OddsApiEvent): Game {
  const bm = pickBook(e.bookmakers);
  const h2h = bm ? findMarket(bm, "h2h") : null;
  const spreads = bm ? findMarket(bm, "spreads") : null;
  const totals = bm ? findMarket(bm, "totals") : null;

  // Moneyline
  let moneyline: Game["odds"]["moneyline"] | undefined;
  if (h2h?.outcomes?.length) {
    const homeML = h2h.outcomes.find((o) => o.name === e.home_team)?.price;
    const awayML = h2h.outcomes.find((o) => o.name === e.away_team)?.price;
    if (homeML !== undefined || awayML !== undefined) {
      moneyline = { home: homeML, away: awayML, book: bm?.key };
    }
  }

  // Spreads
  let spread: Game["odds"]["spread"] | undefined;
  if (spreads?.outcomes?.length) {
    const home = spreads.outcomes.find((o) => o.name === e.home_team);
    const away = spreads.outcomes.find((o) => o.name === e.away_team);
    if (home || away) {
      spread = {
        home:
          home?.point !== undefined && home?.price !== undefined
            ? { point: home.point!, price: home.price! }
            : undefined,
        away:
          away?.point !== undefined && away?.price !== undefined
            ? { point: away.point!, price: away.price! }
            : undefined,
        book: bm?.key,
      };
    }
  }

  // Totals
  let total: Game["odds"]["total"] | undefined;
  if (totals?.outcomes?.length) {
    const over = totals.outcomes.find((o) => o.name.toLowerCase() === "over");
    const under = totals.outcomes.find((o) => o.name.toLowerCase() === "under");
    if (over || under) {
      total = {
        over:
          over?.point !== undefined && over?.price !== undefined
            ? { point: over.point!, price: over.price! }
            : undefined,
        under:
          under?.point !== undefined && under?.price !== undefined
            ? { point: under.point!, price: under.price! }
            : undefined,
        book: bm?.key,
      };
    }
  }

  return {
    id: e.id,
    league,
    kickoffISO: e.commence_time,
    home: e.home_team,
    away: e.away_team,
    odds: { moneyline, spread, total },
  };
}

async function fetchOdds(league: Game["league"]) {
  const sportKey = SPORT_MAP[league];
  if (!sportKey) {
    throw new Error(`Unsupported league: ${league}`);
  }
  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) throw new Error("Missing ODDS_API_KEY");

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("apiKey", API_KEY);

  const r = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Odds API failed (${r.status}): ${text.slice(0, 300)}`);
  }
  const data = (await r.json()) as OddsApiEvent[];
  return data;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const leagueParam = String(req.query.league || "").toLowerCase();
    const league = (["nfl", "nba", "mlb", "nhl", "ncaaf"] as const).find((v) => v === leagueParam);
    if (!league) return res.status(400).json({ error: `Unsupported league "${leagueParam}"` });

    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
    }

    const start = new Date(from + "T00:00:00Z").getTime();
    const end = new Date(to + "T23:59:59Z").getTime();

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
