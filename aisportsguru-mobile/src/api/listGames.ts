export type LeagueId = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab" | "wnba";

export type OddsSide = {
  points?: number;   // e.g., -7 or 46.5
  line?: number;     // sometimes named "line"
  price?: number;    // e.g., -115
  odds?: number;     // sometimes used for price
  money?: number;    // rare alias
};

export type GameOdds = {
  book?: string;
  moneyline?: { away?: number; home?: number; };
  spread?: { away?: OddsSide; home?: OddsSide; };
  total?: { over?: OddsSide; under?: OddsSide; };
};

export type PickKind = "HOME" | "AWAY" | "OVER" | "UNDER";

export type PredOne = {
  pick?: PickKind;
  confidencePct?: number;   // 0..100
  confidence?: number;      // 0..1
  probability?: number;     // 0..1
  line?: number;            // for spread/total
};

export type GamePredictions = {
  moneyline?: PredOne;
  spread?: PredOne;
  total?: PredOne;
};

export type LeagueGame = {
  id: string;
  league: LeagueId;
  away: string;
  home: string;
  kickoffISO?: string;
  odds?: GameOdds;
  predictions?: GamePredictions;
};

type ApiResp = {
  ok: boolean;
  meta?: { league?: LeagueId; from?: string; to?: string; count?: number; source?: string };
  results?: LeagueGame[];
};

const DEPLOY =
  (typeof process !== "undefined" && (process as any).env?.EXPO_PUBLIC_DEPLOY_URL) ||
  (global as any)?.EXPO_PUBLIC_DEPLOY_URL ||
  "";

/** Default 45-day window */
function defaultRange() {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 45);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export async function fetchGames(league: LeagueId, range = defaultRange()): Promise<{
  games: LeagueGame[];
  meta: ApiResp["meta"];
}> {
  const base = DEPLOY || "";
  const url = `${base}/api/games-with-predictions?league=${league}&from=${range.from}&to=${range.to}`;

  console.log("[listGames] GET", url);
  try {
    const res = await fetch(url);
    const json = (await res.json()) as ApiResp;
    const games = json?.results ?? [];
    console.log("[listGames] ok league=%s count=%d source=%s", league, games.length, json?.meta?.source ?? "n/a");
    return { games, meta: json?.meta };
  } catch (e) {
    console.log("[listGames] error league=%s %o", league, e);
    return { games: [], meta: { league, count: 0, source: "error" } };
  }
}

/** Confidence: prefer confidencePct, else confidence/probability (0..1) -> percent, then clamp 51..100. */
export function confidencePct(p?: PredOne): number | undefined {
  if (!p) return;
  let raw =
    (typeof p.confidencePct === "number" ? p.confidencePct : undefined) ??
    (typeof p.confidence === "number" ? p.confidence * 100 : undefined) ??
    (typeof p.probability === "number" ? p.probability * 100 : undefined);
  if (typeof raw !== "number" || Number.isNaN(raw)) return;
  raw = Math.max(0, Math.min(100, raw));
  if (raw === 0) return 51;         // show at least 51
  if (raw < 51) return 51;
  return raw;
}

/** Safely pick a number among common property names */
export function takeNum(...cands: any[]): number | undefined {
  for (const c of cands) {
    if (typeof c === "number" && !Number.isNaN(c)) return c;
  }
  return undefined;
}
