import type { LeagueGame } from '../data/games';

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';
const ENABLED = (process.env.EXPO_PUBLIC_INGEST || '0') === '1';

export async function ingestGamesOdds(games: LeagueGame[]) {
  if (!BASE || !ENABLED || !games?.length) return;
  try {
    const slim = games.map(g => ({
      league: g.league,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      kickoffISO: g.kickoffISO,
      odds: g.odds,
    }));
    await fetch(`${BASE}/api/ingest/games`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: slim }),
    });
  } catch {
    // fire-and-forget; ignore
  }
}
