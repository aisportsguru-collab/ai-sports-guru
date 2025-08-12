"use client";

import { useEffect, useMemo, useState } from "react";

type SpreadPick = { team: string; line: number; edge: number };
type OuPick = { total: number; pick: "Over" | "Under"; edge: number };
type Prediction = {
  id: string;
  sport: string;
  season: number;
  week: number | null;
  game_date: string; // YYYY-MM-DD
  home_team: string;
  away_team: string;
  predicted_winner: string | null;
  confidence: number | null; // 0..1
  spread_pick: SpreadPick | null;
  ou_pick: OuPick | null;
  offense_favor: string | null;
  defense_favor: string | null;
  key_players_home: string[] | null;
  key_players_away: string[] | null;
  source_tag: string | null;
};

const WEEKLY = new Set(["nfl", "ncaaf"]);

function pct(n: number | null | undefined) {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export default function PredictionsPage({
  sport,
  title,
  weekly = false,
}: {
  sport: string;
  title: string;
  weekly?: boolean;
}) {
  const [items, setItems] = useState<Prediction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const season = useMemo(() => new Date().getUTCFullYear(), []);
  const week = useMemo(() => (weekly ? 1 : 0), [weekly]);

  useEffect(() => {
    let url = `/api/predictions/${sport}?season=${season}`;
    if (weekly || WEEKLY.has(sport)) {
      url += `&week=${week}`;
    }
    setLoading(true);
    setErr(null);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setItems(Array.isArray(j.data) ? j.data : []);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [sport, season, week, weekly]);

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto min-h-screen bg-black text-white">
      <h1 className="text-4xl font-bold text-center text-yellow-400 mb-10">
        {title}
      </h1>

      {loading && <p className="text-center text-gray-400">Loading…</p>}
      {!loading && err && (
        <p className="text-center text-red-400">Error: {err}</p>
      )}

      {!loading && !err && (items?.length ?? 0) === 0 && (
        <p className="text-center text-gray-400">
          No predictions available yet.
        </p>
      )}

      {!loading && !err && items && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((g) => {
            const conf = pct(g.confidence);
            return (
              <div
                key={g.id}
                className="bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-700"
              >
                <div className="text-xl font-semibold mb-1 text-yellow-400">
                  {g.away_team} @ {g.home_team}
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  {new Date(g.game_date + "T00:00:00Z").toLocaleDateString()}
                </div>

                <div className="space-y-3 text-sm">
                  {g.predicted_winner && (
                    <div>
                      <span className="text-gray-400">Moneyline:</span>{" "}
                      <span className="text-yellow-400 font-bold">
                        {g.predicted_winner}
                      </span>
                      {typeof conf === "number" && (
                        <span className="text-gray-400"> ({conf}%)</span>
                      )}
                    </div>
                  )}

                  {g.spread_pick && (
                    <div>
                      <span className="text-gray-400">Spread:</span>{" "}
                      <span className="text-yellow-400 font-bold">
                        {g.spread_pick.team} {g.spread_pick.line}
                      </span>{" "}
                      <span className="text-gray-400">
                        (edge {pct(g.spread_pick.edge)}%)
                      </span>
                    </div>
                  )}

                  {g.ou_pick && (
                    <div>
                      <span className="text-gray-400">Total:</span>{" "}
                      <span className="text-yellow-400 font-bold">
                        {g.ou_pick.pick} {g.ou_pick.total}
                      </span>{" "}
                      <span className="text-gray-400">
                        (edge {pct(g.ou_pick.edge)}%)
                      </span>
                    </div>
                  )}

                  {(g.offense_favor || g.defense_favor) && (
                    <div className="pt-2 border-t border-gray-800">
                      {g.offense_favor && (
                        <div>
                          <span className="text-gray-400">Offense:</span>{" "}
                          {g.offense_favor}
                        </div>
                      )}
                      {g.defense_favor && (
                        <div>
                          <span className="text-gray-400">Defense:</span>{" "}
                          {g.defense_favor}
                        </div>
                      )}
                    </div>
                  )}

                  {(g.key_players_home || g.key_players_away) && (
                    <div className="pt-2 border-t border-gray-800 text-xs">
                      {g.key_players_home && g.key_players_home.length > 0 && (
                        <div>
                          <span className="text-gray-400">Home key:</span>{" "}
                          {g.key_players_home.join(", ")}
                        </div>
                      )}
                      {g.key_players_away && g.key_players_away.length > 0 && (
                        <div>
                          <span className="text-gray-400">Away key:</span>{" "}
                          {g.key_players_away.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-12 max-w-2xl mx-auto">
        AI predictions are for educational and entertainment purposes only. No
        outcome is guaranteed. Please gamble responsibly.
      </p>
    </section>
  );
}
