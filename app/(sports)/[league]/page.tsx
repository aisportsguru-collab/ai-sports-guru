'use client';

import React from 'react';
import GameList from '@/components/GameList';

type Game = {
  game_id: string;
  game_time: string;
  league: string;
  away_team: string;
  home_team: string;

  moneyline_away: number | null;
  moneyline_home: number | null;
  line_away: number | null;
  line_home: number | null;
  total_points: number | null;
  over_odds: number | null;
  under_odds: number | null;

  asg_pick: string | null;
  asg_prob: number | null;
};

export default function LeaguePage({ params }: { params: { league: string } }) {
  const league = (params?.league || '').toLowerCase();
  const [games, setGames] = React.useState<Game[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setErr(null);
        setGames(null);
        // Client-side fetch; relative URL works in the browser
        const resp = await fetch(`/api/games?league=${encodeURIComponent(league)}&range=14`, {
          cache: 'no-store',
        });
        if (!resp.ok) throw new Error(`API ${resp.status}`);
        const data = await resp.json();
        const rows = Array.isArray(data?.games) ? data.games : [];
        const filtered: Game[] = rows.filter((g: any) => g && g.game_id);
        if (!cancelled) setGames(filtered);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load');
      }
    }
    if (league) load();
    return () => {
      cancelled = true;
    };
  }, [league]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold uppercase tracking-wide text-zinc-100">
        {league.toUpperCase()}
      </h1>

      {err && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-900/30 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {!games && !err ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
          Loading…
        </div>
      ) : (
        <GameList games={games ?? []} />
      )}
    </div>
  );
}
