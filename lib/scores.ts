const ODDS_API_KEY = process.env.ODDS_API_KEY!;

// Map our sport slugs to TheOddsAPI keys for scores
const SCORE_SPORT_MAP: Record<string, string> = {
  mlb: "baseball_mlb",
  nfl: "americanfootball_nfl",
  nba: "basketball_nba",
  nhl: "icehockey_nhl",
  ncaaf: "americanfootball_ncaaf",
  ncaab: "basketball_ncaab",
  wnba: "basketball_wnba",
};

export type ScoreGame = {
  id: string;
  home_team: string;
  away_team: string;
  commence_time?: string;
  completed: boolean;
  scores?: Array<{ name: string; score: string }>;
};

export async function fetchScores(sport: string, daysFrom = 2): Promise<ScoreGame[]> {
  const key = SCORE_SPORT_MAP[sport];
  if (!key) return [];
  // TheOddsAPI scores endpoint (completed + in‑progress within N days)
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${key}/scores`);
  url.searchParams.set("daysFrom", String(daysFrom)); // how far back to pull
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("apiKey", ODDS_API_KEY);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Scores API ${res.status} ${text}`);
  }
  const json = (await res.json()) as ScoreGame[];
  return json;
}

export function parseFinalScores(g: ScoreGame): { home: number; away: number } | null {
  if (!g.completed || !g.scores) return null;
  let home = NaN, away = NaN;
  for (const s of g.scores) {
    if (!s || s.score == null) continue;
    if (s.name === g.home_team) home = Number(s.score);
    if (s.name === g.away_team) away = Number(s.score);
  }
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  return { home, away };
}
