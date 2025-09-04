import { fetchGames } from "@/lib/fetchGames";
import GameCard from "@/components/GameCard";

export default async function LeagueScreen({ league, title }: { league: string; title: string }) {
  const games = await fetchGames(league, 14);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{title}</h1>
      {games.length === 0 ? (
        <div className="opacity-70">No upcoming games found.</div>
      ) : (
        <div className="grid gap-4">
          {games.map((g) => <GameCard key={g.game_uuid || g.game_id} game={g} />)}
        </div>
      )}
    </div>
  );
}
