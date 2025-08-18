import type { NextApiRequest, NextApiResponse } from "next";

/** ====== Types your mobile expects ====== */
type League = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "wnba" | "ncaab";

export type Game = {
  id: string;
  league: League;
  kickoff_iso: string;
  home_team: string;
  away_team: string;
  odds?: {
    moneyline?: { home?: number; away?: number; book?: string };
    spread?: { home?: number; away?: number; line?: number; book?: string };
    total?: { over?: number; under?: number; line?: number; book?: string };
  };
};

/** Map league -> The Odds API sport key (or your current odds backend key). */
const SPORT_BY_LEAGUE: Record<League, string> = {
  nfl:   "americanfootball_nfl",
  nba:   "basketball_nba",
  mlb:   "baseball_mlb",
  nhl:   "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  wnba:  "basketball_wnba",
  ncaab: "basketball_ncaab",
};

/** Basic fetch to odds backend. Uses your existing env if present. */
async function fetchOdds(league: League) {
  // Prefer your existing env if you had one; otherwise The Odds API shape.
  const base = process.env.ODDS_API_BASE ?? "https://api.the-odds-api.com/v4";
  const key  = process.env.ODDS_API_KEY  ?? "";
  const sport = SPORT_BY_LEAGUE[league];

  const url = key
    ? `${base}/sports/${sport}/odds/?regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso&apiKey=${encodeURIComponent(key)}`
    : `${base}/sports/${sport}/odds`; // fallback – your own proxy can ignore the key

  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Odds API failed (${r.status}): ${text.slice(0,300)}`);
  }
  return (await r.json()) as any[];
}

/** Convert odds event into the Game the mobile UI expects. */
function asGame(league: League, e: any): Game {
  const id = e.id || `${league}:${e.home_team || ""}:${e.away_team || ""}:${e.commence_time || ""}`;
  const book = e.bookmakers?.[0];
  const markets = book?.markets || [];

  const find = (key: string) => markets.find((m: any) => m.key === key);
  const h2h = find("h2h");
  const spreads = find("spreads");
  const totals = find("totals");

  const moneyline: Game["odds"]["moneyline"] = h2h
    ? {
        home: h2h.outcomes?.find((o: any) => o.name === e.home_team)?.price,
        away: h2h.outcomes?.find((o: any) => o.name === e.away_team)?.price,
        book: book?.title,
      }
    : undefined;

  const spread: Game["odds"]["spread"] = spreads
    ? {
        line:
          spreads.outcomes?.find((o: any) => o.name === e.home_team)?.point ??
          spreads.outcomes?.[0]?.point,
        home: spreads.outcomes?.find((o: any) => o.name === e.home_team)?.price,
        away: spreads.outcomes?.find((o: any) => o.name === e.away_team)?.price,
        book: book?.title,
      }
    : undefined;

  const total: Game["odds"]["total"] = totals
    ? {
        line: totals.outcomes?.[0]?.point,
        over: totals.outcomes?.find((o: any) => o.name?.toLowerCase?.() === "over")?.price,
        under: totals.outcomes?.find((o: any) => o.name?.toLowerCase?.() === "under")?.price,
        book: book?.title,
      }
    : undefined;

  return {
    id: String(id),
    league,
    kickoff_iso: e.commence_time,
    home_team: e.home_team,
    away_team: e.away_team,
    odds: { moneyline, spread, total },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const leagueParam = String(req.query.league || "").toLowerCase() as League;
    if (!["nfl","nba","mlb","nhl","ncaaf","wnba","ncaab"].includes(leagueParam))
      return res.status(400).json({ error: `Unsupported league "${leagueParam}"` });

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
    return res.status(500).json({ error: err?.message || "server_error" });
  }
}
