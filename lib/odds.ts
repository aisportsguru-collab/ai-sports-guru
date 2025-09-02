import { requireEnv, readEnv } from "./env";

export type Sport =
  | "nfl" | "ncaaf" | "nba" | "wnba" | "ncaab" | "nhl" | "mlb";

const BASE = "https://api.the-odds-api.com/v4";

export async function fetchOddsFromProvider(sport: Sport) {
  const apiKey = requireEnv("ODDS_API_KEY");
  const regions = readEnv("ODDS_API_REGION", "us");
  const markets = readEnv("ODDS_API_MARKETS", "h2h,spreads,totals");
  // status=upcoming ensures we only pull future games
  const url = `${BASE}/sports/${sport}/odds/?regions=${regions}&markets=${markets}&oddsFormat=american&dateFormat=iso&apiKey=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Odds API error: ${res.status} ${res.statusText} ${text}`.trim());
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
