"use client";
import GameCard from "./GameCard";

type Props = { games?: any[] };

export default function LeagueScreen({ games = [] }: Props) {
  return (
    <div className="grid gap-4">
      {games.map((g: any) => (
        <GameCard key={String(g.game_uuid ?? g.game_id ?? Math.random())} row={g} />
      ))}
    </div>
  );
}
