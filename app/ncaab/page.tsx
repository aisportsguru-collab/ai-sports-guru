"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type Prediction = {
  gameId: string;
  teams: string[];
  startTime: string;
  moneyline: { prediction: string; confidence: number };
  spread: { prediction: string; confidence: number };
  total: { prediction: string; confidence: number };
};

const SPORT = "ncaab"; // used for logo path and API route

export default function Page() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const router = useRouter();

  // 1) Check subscription
  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch("/api/check-subscription");
        const data = await res.json();
        if (!data?.active) {
          router.push("/pricing");
        } else {
          setHasAccess(true);
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
        router.push("/pricing");
      }
    }
    checkAccess();
  }, [router]);

  // 2) Fetch predictions once access is confirmed
  useEffect(() => {
    async function fetchPredictions() {
      try {
        const response = await fetch(`/api/predictions/ncaab`);
        const data = await response.json();
        setPredictions(data || []);
      } catch (err) {
        console.error(`Error fetching \${SPORT} predictions:`, err);
      } finally {
        setLoading(false);
      }
    }
    if (hasAccess) fetchPredictions();
  }, [hasAccess]);

  if (hasAccess === null) {
    return <p className="text-white p-6">Checking subscription...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 pt-24">
      <div className="flex items-center gap-3 mb-8">
        <Image
          src={`/icons/\${SPORT}.svg`}
          alt={`\${SPORT.toUpperCase()} logo`}
          width={32}
          height={32}
          priority
        />
        <h1 className="text-3xl font-bold">
          {SPORT.toUpperCase()} AI Predictions
        </h1>
      </div>

      {loading ? (
        <p>Loading predictions...</p>
      ) : predictions.length === 0 ? (
        <p>No predictions available.</p>
      ) : (
        <div className="grid gap-6">
          {predictions.map((game) => (
            <Card
              key={game.gameId}
              className="bg-gray-900 border border-gray-700 text-white"
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">
                    {game.teams[0]} vs {game.teams[1]}
                  </h2>
                  <span className="text-sm text-gray-400">
                    {new Date(game.startTime).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <h3 className="text-sm text-gray-400">Moneyline</h3>
                    <p className="text-lg font-bold">
                      {game.moneyline.prediction}
                    </p>
                    <p className="text-sm text-green-400">
                      {game.moneyline.confidence.toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm text-gray-400">Spread</h3>
                    <p className="text-lg font-bold">
                      {game.spread.prediction}
                    </p>
                    <p className="text-sm text-green-400">
                      {game.spread.confidence.toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm text-gray-400">Total</h3>
                    <p className="text-lg font-bold">{game.total.prediction}</p>
                    <p className="text-sm text-green-400">
                      {game.total.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
