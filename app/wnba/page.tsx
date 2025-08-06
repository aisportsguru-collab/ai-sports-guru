"use client";

import React, { useEffect, useState } from "react";

type Game = {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  moneyline: { home: number; away: number };
  spread: { point: number; home: number; away: number };
  total: { point: number; over: number; under: number };
  prediction: {
    moneyline: { pick: string; confidence: number };
    spread: { pick: string; confidence: number };
    total: { pick: string; confidence: number };
  };
};

export default function WNBAPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wnba/games")
      .then((res) => res.json())
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch WNBA games:", err);
        setLoading(false);
      });
  }, []);

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold text-center text-yellow-400 mb-12">
        WNBA Predictions
      </h1>

      {loading ? (
        <p className="text-center text-gray-400">Loading games...</p>
      ) : games.length === 0 ? (
        <p className="text-center text-gray-400">No games available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-700"
            >
              <div className="text-xl font-semibold mb-1 text-yellow-400">
                {game.away_team} @ {game.home_team}
              </div>
              <div className="text-sm text-gray-400 mb-4">
                {new Date(game.commence_time).toLocaleString()}
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="font-medium text-gray-300">Moneyline:</span>
                  <br />
                  {game.away_team}:{" "}
                  <span className="text-white">{game.moneyline.away}</span> |{" "}
                  {game.home_team}:{" "}
                  <span className="text-white">{game.moneyline.home}</span>
                </div>

                <div>
                  <span className="font-medium text-gray-300">Spread:</span>
                  <br />
                  {game.away_team}:{" "}
                  <span className="text-white">
                    {game.spread.away} ({game.spread.point})
                  </span>{" "}
                  | {game.home_team}:{" "}
                  <span className="text-white">{game.spread.home}</span>
                </div>

                <div>
                  <span className="font-medium text-gray-300">Total:</span>
                  <br />
                  Over {game.total.point}:{" "}
                  <span className="text-white">{game.total.over}</span> | Under:{" "}
                  <span className="text-white">{game.total.under}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700 space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">AI Moneyline Pick:</span>{" "}
                  <span className="text-yellow-400 font-bold">
                    {game.prediction.moneyline.pick}
                  </span>{" "}
                  <span className="text-gray-400">
                    ({game.prediction.moneyline.confidence}%)
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">AI Spread Pick:</span>{" "}
                  <span className="text-yellow-400 font-bold">
                    {game.prediction.spread.pick}
                  </span>{" "}
                  <span className="text-gray-400">
                    ({game.prediction.spread.confidence}%)
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">AI Total Pick:</span>{" "}
                  <span className="text-yellow-400 font-bold">
                    {game.prediction.total.pick}
                  </span>{" "}
                  <span className="text-gray-400">
                    ({game.prediction.total.confidence}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-12 max-w-2xl mx-auto">
        AI predictions are for educational and entertainment purposes only. No outcome is guaranteed. Please gamble responsibly.
      </p>
    </section>
  );
}
