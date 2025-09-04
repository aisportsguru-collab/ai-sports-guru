'use client';

import React from 'react';
import GameCard from './GameCard';

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

export default function GameList({ games }: { games?: (Game | null | undefined)[] }) {
  const safe = (games ?? []).filter(
    (g): g is Game => !!g && typeof g.game_id === 'string' && !!g.game_id
  );

  if (!safe.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        No games in this window.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safe.map((g) => (
        <GameCard key={g.game_id} game={g} />
      ))}
    </div>
  );
}
