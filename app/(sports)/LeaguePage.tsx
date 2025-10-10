// app/(sports)/LeaguePage.tsx
export const dynamic = 'force-dynamic';

import GameCard from '@/components/GameCard';

type ApiGame = {
  game_id: string;
  game_uuid?: string;
  sport: string;
  start_time: string;
  home_team: string;
  away_team: string;
  status?: string;
  ml_price_home?: number|null;
  ml_price_away?: number|null;
  spread_line?: number|null;
  spread_price_home?: number|null;
  spread_price_away?: number|null;
  total_line?: number|null;
  total_over_price?: number|null;
  total_under_price?: number|null;
  model_version?: string|null;
  moneyline_pick?: string|null;
  moneyline_conf?: number|null;
  spread_pick?: string|null;
  pred_spread_line?: number|null;
  spread_conf?: number|null;
  total_pick?: string|null;
  pred_total_line?: number|null;
  total_conf?: number|null;
  prediction_created_at?: string|null;
};

async function getGames(league: string): Promise<ApiGame[]> {
  try {
    const res = await fetch(`/api/games?league=${encodeURIComponent(league)}&daysFrom=7`, {
      cache: 'no-store',
      // Make sure this page is dynamic and not pre-rendered at build time.
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function LeaguePage({ league }: { league: string }) {
  const games = await getGames(league);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold capitalize">{league} — upcoming games</h1>
      {games.length === 0 ? (
        <p className="text-sm opacity-70">No games found in the next 7 days.</p>
      ) : (
        <div className="grid gap-3">
          {games.map((g) => (
            <GameCard key={g.game_uuid || g.game_id} row={g as any} />
          ))}
        </div>
      )}
    </div>
  );
}
