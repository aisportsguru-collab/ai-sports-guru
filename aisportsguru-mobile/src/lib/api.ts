/**
 * Lightweight API client for the mobile app.
 * - Tries multiple bases (env + known deploys)
 * - Only parses JSON when response content-type is JSON
 * - Returns { games, meta } with a graceful "error" source on failures
 */

export type LeagueID = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab" | "wnba";

export type MoneylineOdds = { away?: number | null; home?: number | null; book?: string | null };
export type SpreadSide   = { line?: number | null; price?: number | null };
export type TotalSide    = { line?: number | null; price?: number | null };
export type SpreadOdds   = { away?: SpreadSide | null; home?: SpreadSide | null; book?: string | null };
export type TotalOdds    = { over?: TotalSide | null;  under?: TotalSide | null;  book?: string | null };

export type OddsPack = { moneyline?: MoneylineOdds | null; spread?: SpreadOdds | null; total?: TotalOdds | null };

export type PredPick = "HOME" | "AWAY" | "OVER" | "UNDER";
export type OnePrediction = { pick?: PredPick | null; confidencePct?: number | null; probability?: number | null; line?: number | null };
export type Predictions = { moneyline?: OnePrediction | null; spread?: OnePrediction | null; total?: OnePrediction | null };

export type LeagueGame = {
  id: string;
  league: LeagueID;
  kickoffISO?: string | null;
  away?: string | null;
  home?: string | null;
  awayTeam?: string | null; // sometimes present
  homeTeam?: string | null;
  odds?: OddsPack | null;
  predictions?: Predictions | null;
};

type ApiResponse = { games: LeagueGame[]; meta: { league: LeagueID; count: number; source: string } };

const API_BASES = [
  process.env.EXPO_PUBLIC_API_BASE,
  "https://ai-sports-guru-ek55nturj-jordan-smiths-projects-aba7b6c0.vercel.app",
  "https://ai-sports-guru.vercel.app",
].filter(Boolean) as string[];

// Format YYYY-MM-DD
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function defaultDateWindow(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  to.setDate(to.getDate() + 45);
  return { from: ymd(from), to: ymd(to) };
}

async function tryFetchJSON(url: string) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    const ct = String(res.headers.get("content-type") || "");
    if (!res.ok || !ct.includes("application/json")) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} (ct=${ct}) ${text?.slice(0,80)}`);
    }
    return await res.json();
  } catch (err) {
    throw err;
  }
}

export async function listGames(league: LeagueID, fromISO?: string, toISO?: string): Promise<ApiResponse> {
  const { from, to } = fromISO && toISO ? { from: fromISO, to: toISO } : defaultDateWindow();
  const path = `/api/games-with-predictions?league=${encodeURIComponent(league)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  for (const base of API_BASES) {
    const url = `${base}${path}`;
    try {
      const json = await tryFetchJSON(url);
      const games: LeagueGame[] = Array.isArray(json?.games) ? json.games : [];
      const count = Number(json?.meta?.count ?? games.length ?? 0) || 0;
      const source = String(json?.meta?.source ?? "fresh");
      // eslint-disable-next-line no-console
      console.log("[listGames] ok league=%s count=%d source=%s", league, count, source);
      return { games, meta: { league, count, source } };
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log("[listGames] error league=%s %s", league, e?.message ?? e);
      // Try the next base…
    }
  }

  // All bases failed – return safe empty
  return { games: [], meta: { league, count: 0, source: "error" } };
}
