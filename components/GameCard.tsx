import { format } from "date-fns";

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string; // ISO formatted date
  odds: {
    moneylineHome: number;
    moneylineAway: number;
    spreadHome: number;
    spreadAway: number;
    totalPoints: number;
  };
  predictions: {
    moneylineWinner: "home" | "away";
    moneylineConfidence: number; // 0-100
    spreadPick: "home" | "away";
    spreadValue: number;
    spreadConfidence: number;
    totalPick: "over" | "under";
    totalConfidence: number;
  };
}

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const date = format(new Date(game.commenceTime), "PPpp");
  const { moneylineHome, moneylineAway, spreadHome, spreadAway, totalPoints } =
    game.odds;
  const {
    moneylineWinner,
    moneylineConfidence,
    spreadPick,
    spreadValue,
    spreadConfidence,
    totalPick,
    totalConfidence,
  } = game.predictions;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 space-y-4">
      {/* Teams and kickoff time */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-secondary">
            {game.awayTeam} @ {game.homeTeam}
          </h3>
          <p className="text-xs text-gray-500">{date}</p>
        </div>
        {/* Moneyline odds */}
        <div className="text-right text-sm text-gray-700">
          <div>
            ML: {moneylineAway} / {moneylineHome}
          </div>
          <div>
            Spread: {spreadAway} / {spreadHome}
          </div>
          <div>Total: {totalPoints}</div>
        </div>
      </div>
      {/* Predictions section */}
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div>
          <span className="font-medium">Moneyline: </span>
          <span className="capitalize">{moneylineWinner}</span>{" "}
          <span className="text-xs text-gray-500">
            ({moneylineConfidence}% confidence)
          </span>
        </div>
        <div>
          <span className="font-medium">Spread: </span>
          {spreadPick} {spreadValue > 0 ? "+" : ""}
          {spreadValue}{" "}
          <span className="text-xs text-gray-500">
            ({spreadConfidence}% confidence)
          </span>
        </div>
        <div>
          <span className="font-medium">Total: </span>
          {totalPick}{" "}
          <span className="text-xs text-gray-500">
            ({totalConfidence}% confidence)
          </span>
        </div>
      </div>
    </div>
  );
}
