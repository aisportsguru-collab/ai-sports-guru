export type ApiGame = {
  game_uuid?: string | null;         // may be present
  game_id: string;                   // text id for display
  game_time: string;                 // ISO
  league: string;
  away_team: string;
  home_team: string;

  moneyline_away: number | null;
  moneyline_home: number | null;
  spread_line: number | null;        // home line (negative => home favored)
  total_points: number | null;
  over_odds: number | null;
  under_odds: number | null;

  ai_ml_pick: "HOME" | "AWAY" | null;
  ai_ml_conf: number | null;
  ai_spread_pick: string | null;     // e.g. "HOME -3.5" or "AWAY +3.5" or "PICK"
  ai_spread_conf: number | null;
  ai_total_pick: string | null;      // e.g. "OVER 47.5"
  ai_total_conf: number | null;
  ai_total_number: number | null;    // numeric total if present
};

function baseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/,"");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/,"");
  return "http://localhost:3000";
}

export async function fetchGames(league: string, rangeDays = 14): Promise<ApiGame[]> {
  const url = new URL("/api/games", baseUrl());
  url.searchParams.set("league", league);
  url.searchParams.set("range", String(rangeDays));
  const res = await fetch(url.toString(), { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`fetchGames(${league}) ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.games) ? json.games : [];
}
