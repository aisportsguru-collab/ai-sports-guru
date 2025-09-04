"use client";

import React, { useEffect, useState } from "react";
import GameCard from "./GameCard";

type Game = {
  game_id: string;
  game_time: string | null;
  league: string;
  away_team: string;
  home_team: string;
  moneyline_away: number | null;
  moneyline_home: number | null;
  line_away: number | null;
  line_home: number | null;
  total_points: number | null;
  asg_pick: string | null;
  asg_prob: number | null;
};

export default function LeaguePage({ league }: { league: string }) {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let go = true;
    setLoading(true);
    fetch(`/api/games?league=${encodeURIComponent(league)}&range=14`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => { if (!go) return; if (j.error) setError(j.error); else setGames(j.games || []); })
      .catch(e => { if (!go) return; setError(String(e)); })
      .finally(() => { if (!go) return; setLoading(false); });
    return () => { go = false; };
  }, [league]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <h1 className="mt-10 text-2xl md:text-3xl font-semibold uppercase">{league} Games</h1>
      <p className="text-sm text-zinc-400 mt-1">Moneyline, spread, totals, and ASG predictions.</p>

      {loading ? (
        <div className="mt-8 text-zinc-400">Loading…</div>
      ) : error ? (
        <div className="mt-8 text-red-400">Error: {error}</div>
      ) : games.length === 0 ? (
        <div className="mt-8 text-zinc-400">No games found for the selected window.</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map(g => <GameCard key={g.game_id} g={g} />)}
        </div>
      )}
    </main>
  );
}
