import GameCard from '../../components/GameCard';
import { getGames } from '../../lib/getGames';

export const metadata = {
  title: 'NBA Odds & Predictions – AI Sports Guru',
  description: 'View real-time NBA odds alongside our advanced AI-powered predictions for every matchup.'
};

export default async function Page() {
  const games = await getGames('nba');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary">NBA Odds & Predictions</h1>
      <p className="text-gray-600">
        Compare the latest NBA betting odds with our proprietary AI predictions for moneyline,
        spread and totals. Updated in real time so you can make confident wagers.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}