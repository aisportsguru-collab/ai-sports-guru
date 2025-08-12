type OddsEvent = {
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
        name: string;   // team name, or Over, or Under
        price: number;  // american odds
        point?: number; // spread line or total
      }>;
    }>;
  }>;
};

const SPORT_KEYS: Record<string, string> = {
  nba: "basketball_nba",
  mlb: "baseball_mlb",
  nhl: "icehockey_nhl",
  ncaab: "basketball_ncaab",
  wnba: "basketball_wnba",
  nfl: "americanfootball_nfl",
  ncaaf: "americanfootball_ncaaf",
};

const PROVIDER_KEY_TO_SLUG: Record<string, string> = {
  basketball_nba: "nba",
  baseball_mlb: "mlb",
  icehockey_nhl: "nhl",
  basketball_ncaab: "ncaab",
  basketball_wnba: "wnba",
  americanfootball_nfl: "nfl",
  americanfootball_ncaaf: "ncaaf",
};

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/**
 * Single TheOddsAPI call per sport per date window.
 * Set date as YYYY-MM-DD to limit results and cost. If omitted, provider returns all upcoming which may be larger.
 */
export async function fetchOddsEvents(params: { sport: string; date?: string }) {
  const apiKey = need("ODDS_API_KEY");
  const sportKey = SPORT_KEYS[params.sport];
  if (!sportKey) throw new Error(`Unsupported sport ${params.sport}`);

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  if (params.date) {
    url.searchParams.set("commenceTimeFrom", `${params.date}T00:00:00Z`);
    url.searchParams.set("commenceTimeTo", `${params.date}T23:59:59Z`);
  }
  url.searchParams.set("apiKey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`TheOddsAPI error ${res.status}  ${txt}`);
  }
  const data = (await res.json()) as OddsEvent[];
  return data;
}

/**
 * Normalize provider events to our schema.
 * IMPORTANT: we force `sport` to the canonical slug passed in.
 */
export function normalizeFromOdds(events: OddsEvent[], canonicalSport: string) {
  const games = events.map((ev) => {
    const d = new Date(ev.commence_time);
    const game_date = d.toISOString().slice(0, 10);
    return {
      external_id: ev.id,
      sport: canonicalSport, // enforce short slug like 'mlb'
      season: d.getUTCFullYear(),
      week: 0 as number, // we set correct week upstream in the pipeline for weekly sports
      game_date,
      home_team: ev.home_team,
      away_team: ev.away_team,
    };
  });

  const snapshots = events.map((ev) => {
    let spread_line: number | null = null;
    let spread_price_home: number | null = null;
    let spread_price_away: number | null = null;
    let total_line: number | null = null;
    let total_over_price: number | null = null;
    let total_under_price: number | null = null;
    let moneyline_home: number | null = null;
    let moneyline_away: number | null = null;

    for (const bm of ev.bookmakers || []) {
      for (const m of bm.markets || []) {
        if (m.key === "h2h") {
          const home = m.outcomes.find((o) => o.name === ev.home_team);
          const away = m.outcomes.find((o) => o.name === ev.away_team);
          if (isNum(home?.price)) moneyline_home = avg(moneyline_home, home!.price);
          if (isNum(away?.price)) moneyline_away = avg(moneyline_away, away!.price);
        }
        if (m.key === "spreads") {
          const home = m.outcomes.find((o) => o.name === ev.home_team);
          const away = m.outcomes.find((o) => o.name === ev.away_team);
          if (isNum(home?.point)) spread_line = avg(spread_line, home!.point!);
          if (isNum(home?.price)) spread_price_home = avg(spread_price_home, home!.price);
          if (isNum(away?.price)) spread_price_away = avg(spread_price_away, away!.price);
        }
        if (m.key === "totals") {
          const over = m.outcomes.find((o) => o.name.toLowerCase().startsWith("over"));
          const under = m.outcomes.find((o) => o.name.toLowerCase().startsWith("under"));
          if (isNum(over?.point)) total_line = avg(total_line, over!.point!);
          if (isNum(over?.price)) total_over_price = avg(total_over_price, over!.price);
          if (isNum(under?.price)) total_under_price = avg(total_under_price, under!.price);
        }
      }
    }

    return {
      external_id: ev.id,
      moneyline_home,
      moneyline_away,
      spread_line,
      spread_price_home,
      spread_price_away,
      total_line,
      total_over_price,
      total_under_price,
    };
  });

  return { games, snapshots };
}

function isNum(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function avg(a: number | null, b: number) {
  if (a === null || Number.isNaN(a)) return b;
  return (a + b) / 2;
}
