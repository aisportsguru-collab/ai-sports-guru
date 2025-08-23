import { THEME } from "../theme/colors";

// Read from env: set EXPO_PUBLIC_API_BASE in app config or .env
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "http://localhost:4000";

export type Game = {
  id: string;
  league: string;
  away: string;
  home: string;
  start: string;       // ISO string
  spread?: string;     // e.g. "HOME -3.5"
  total?: string;      // e.g. "O/U 212.5"
  mlAway?: string;     // "+145"
  mlHome?: string;     // "-165"
  pick?: string;       // model pick summary
  edge?: string;       // "+3.1% EV"
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  leagues: async (): Promise<string[]> => {
    // Optional endpoint; fallback to static list if backend doesn't provide
    try {
      const data = await http<{ leagues: string[] }>("/leagues");
      return data.leagues;
    } catch {
      return ["nfl","nba","mlb","nhl","ncaaf","ncaab","wnba"];
    }
  },
  gamesByLeague: async (leagueId: string): Promise<Game[]> => {
    const data = await http<{ games: Game[] }>(`/leagues/${leagueId}/games`);
    return (data.games ?? []).map((g) => ({
      ...g,
      league: g.league ?? leagueId,
    }));
  },
};
