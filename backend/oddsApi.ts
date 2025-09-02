const ODDS_KEY = process.env.ODDS_API_KEY;

export type OddsApiGame = {
  id: string;
  sport_key: string;
  commence_time: string;  // ISO
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    last_update: string;
    markets: Array<{
      key: "h2h" | "spreads" | "totals";
      outcomes?: Array<{
        name: string;       // team or "Over"/"Under"
        price?: number|null;
        point?: number|null;
      }>;
    }>;
  }>;
};

export const SPORT_KEY_MAP: Record<string,string> = {
  nfl: "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
  mlb: "baseball_mlb",
  // TODO: nba, nhl, ncaab, wnba
};

export async function fetchOddsApi(
  sportSlug: string,
  fromISO: string,
  toISO: string
): Promise<OddsApiGame[]> {
  if (!ODDS_KEY) return [];
  const sportKey = SPORT_KEY_MAP[sportSlug];
  if (!sportKey) return [];

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("apiKey", ODDS_KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) return [];
  const data = (await res.json()) as OddsApiGame[];

  // quick window filter
  const from = Date.parse(fromISO);
  const to = Date.parse(toISO);
  return data.filter(g => {
    const t = Date.parse(g.commence_time);
    return isFinite(t) && t >= from && t <= to;
  });
}

export function extractBookSnapshot(g: OddsApiGame) {
  const book = g.bookmakers?.[0];
  let ml_home: number | null = null, ml_away: number | null = null;
  let spread_line: number | null = null, spread_home_price: number | null = null, spread_away_price: number | null = null;
  let total_points: number | null = null, over_price: number | null = null, under_price: number | null = null;

  for (const m of (book?.markets ?? [])) {
    const outcomes = m.outcomes ?? [];
    if (m.key === "h2h") {
      const h = outcomes.find(o => o.name === g.home_team);
      const a = outcomes.find(o => o.name === g.away_team);
      ml_home = h?.price ?? null;
      ml_away = a?.price ?? null;
    } else if (m.key === "spreads") {
      const h = outcomes.find(o => o.name === g.home_team);
      const a = outcomes.find(o => o.name === g.away_team);
      spread_line = h?.point ?? null;               // home points (negative if favorite)
      spread_home_price = h?.price ?? null;
      spread_away_price = a?.price ?? null;
    } else if (m.key === "totals") {
      const over = outcomes.find(o => (o.name || "").toLowerCase() === "over");
      const under = outcomes.find(o => (o.name || "").toLowerCase() === "under");
      total_points = (over?.point ?? under?.point) ?? null;
      over_price = over?.price ?? null;
      under_price = under?.price ?? null;
    }
  }
  return { ml_home, ml_away, spread_line, spread_home_price, spread_away_price, total_points, over_price, under_price };
}
