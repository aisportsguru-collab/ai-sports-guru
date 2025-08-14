"use client";

import { useEffect, useMemo, useState } from "react";

type MarketPick = {
  market: "moneyline" | "spread" | "total";
  pick: string;
  confidence: number; // 0..100
  rationale: string;
};

type Game = {
  game_id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  moneyline: { home?: number; away?: number };
  spread: { home?: number; away?: number; point?: number };
  total: { over?: number; under?: number; point?: number };
  predictions: MarketPick[];
};

export default function PredictionsGrid({
  sport,
  initialDaysFrom = 0,
}: {
  sport: string;
  initialDaysFrom?: number;
}) {
  const [daysFrom, setDaysFrom] = useState<number>(initialDaysFrom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);

  const dateLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + daysFrom);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [daysFrom]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/predictions/${sport}?daysFrom=${daysFrom}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const json = await res.json();
      setGames(json?.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysFrom, sport]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold capitalize">{sport} Predictions</h1>
          <p className="text-sm text-gray-400">Lines + AI picks for {dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300">Day</label>
          <select
            value={daysFrom}
            onChange={(e) => setDaysFrom(Number(e.target.value))}
            className="bg-black text-white border border-gray-700 rounded-lg px-3 py-2"
          >
            <option value={0}>Today</option>
            <option value={1}>+1 day</option>
            <option value={2}>+2 days</option>
            <option value={3}>+3 days</option>
          </select>
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="grid place-items-center h-40 text-gray-300">Loading predictions…</div>
      )}
      {error && !loading && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && games.length === 0 && (
        <div className="grid place-items-center h-40 text-gray-400">No games found.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {games.map((g) => (
          <div key={g.game_id} className="rounded-2xl border border-gray-800 bg-black p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">
                  {new Date(g.commence_time).toLocaleString()}
                </div>
                <div className="text-lg font-semibold">
                  {g.away_team} @ {g.home_team}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                <div className="text-gray-400 text-xs mb-1">Moneyline</div>
                <div className="text-xs text-gray-400">
                  Home: {formatOdds(g.moneyline.home)} • Away: {formatOdds(g.moneyline.away)}
                </div>
                {renderPick(g.predictions, "moneyline")}
              </div>

              <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                <div className="text-gray-400 text-xs mb-1">Spread</div>
                <div className="text-xs text-gray-400">
                  Line: {g.spread.point ?? "—"} • H: {formatOdds(g.spread.home)} • A: {formatOdds(g.spread.away)}
                </div>
                {renderPick(g.predictions, "spread")}
              </div>

              <div className="p-2 rounded-lg bg-gray-900 border border-gray-800">
                <div className="text-gray-400 text-xs mb-1">Total</div>
                <div className="text-xs text-gray-400">
                  {g.total.point ? `O/U ${g.total.point}` : "—"} • O: {formatOdds(g.total.over)} • U: {formatOdds(g.total.under)}
                </div>
                {renderPick(g.predictions, "total")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderPick(picks: MarketPick[], market: MarketPick["market"]) {
  const p = picks.find((x) => x.market === market);
  if (!p) return <div className="text-xs text-gray-500 mt-1">No pick</div>;
  return (
    <div className="mt-2">
      <div className="text-sm font-semibold">{p.pick}</div>
      <div className="text-xs text-gray-400 flex items-center gap-2">
        <span>Conf: {p.confidence}%</span>
        <span className="truncate">• {p.rationale}</span>
      </div>
    </div>
  );
}

function formatOdds(v?: number) {
  if (typeof v !== "number") return "—";
  return v > 0 ? `+${v}` : `${v}`;
}
