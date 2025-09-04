import { getOddsApiKey } from "./env";

type League = "nfl" | "mlb" | "ncaaf";

export type NormalizedGame = {
  game_id: string;
  league: League | string;
  home_team: string;
  away_team: string;
  moneyline_home: number | null;
  moneyline_away: number | null;
  line_home: number | null;
  line_away: number | null;
  game_time: string | null; // ISO
};

function sportKeyForLeague(lg: string) {
  const t = lg.toLowerCase();
  if (t === "nfl") return "americanfootball_nfl";
  if (t === "mlb") return "baseball_mlb";
  if (t === "ncaaf") return "americanfootball_ncaaf";
  return null;
}

function pickBest<T>(arr: T[] | undefined): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[0];
}

/** Find a market among bookmakers */
function market(book: any, key: string) {
  return (book.markets || []).find((m: any) => m.key === key) || null;
}

function toAmerican(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(v)) return null;
  // already american? we assume market odds are american; pass through
  return Number(v);
}

function spreadToHomeAway(h: any): { home: number | null; away: number | null } {
  if (!h || !h.outcomes) return { home: null, away: null };
  // normalize: outcomes have name & point (spread)
  let home: number | null = null, away: number | null = null;
  for (const o of h.outcomes) {
    const n = String(o.name || "").toLowerCase();
    const pt = typeof o.point === "number" ? o.point : null;
    if (n.includes("home")) home = pt;
    else if (n.includes("away")) away = pt;
  }
  return { home, away };
}

export async function getOddsRange(opts: { league: string; days: number }): Promise<NormalizedGame[]> {
  const key = getOddsApiKey();
  const sport = sportKeyForLeague(opts.league);
  if (!key || !sport) return [];

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds/`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", process.env.ODDS_API_REGION || "us");
  url.searchParams.set("markets", process.env.ODDS_API_MARKETS || "h2h,spreads");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  // Optional to reduce size: choose a few common books
  url.searchParams.set("bookmakers", "draftkings,betmgm,caesars,fanduel");

  let data: any[] = [];
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    data = await res.json();
  } catch {
    return [];
  }

  const now = Date.now();
  const horizon = now + opts.days * 24 * 60 * 60 * 1000;

  const out: NormalizedGame[] = [];
  for (const g of data) {
    const commence = g.commence_time ? Date.parse(g.commence_time) : NaN;
    if (!Number.isFinite(commence)) continue;
    if (commence < now || commence > horizon) continue;

    const b = pickBest(g.bookmakers);
    if (!b) continue;

    const h2h = market(b, "h2h");
    const spd = market(b, "spreads");

    // H2H outcomes map
    let mlHome: number | null = null;
    let mlAway: number | null = null;

    if (h2h && Array.isArray(h2h.outcomes)) {
      for (const o of h2h.outcomes) {
        const name = String(o.name || "");
        if (name === g.home_team) mlHome = toAmerican(o.price);
        if (name === g.away_team) mlAway = toAmerican(o.price);
      }
    }

    const s = spreadToHomeAway(spd);

    out.push({
      game_id: g.id || `${g.home_team}-${g.away_team}-${g.commence_time}`,
      league: opts.league.toLowerCase(),
      home_team: g.home_team,
      away_team: g.away_team,
      moneyline_home: mlHome,
      moneyline_away: mlAway,
      line_home: s.home,
      line_away: s.away,
      game_time: g.commence_time || null,
    });
  }
  return out;
}
