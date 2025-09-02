"use client";

import * as React from "react";

type Game = {
  game_id: string;
  league: string;
  start: string;
  home: string;
  away: string;
  ml_home: number | null;
  ml_away: number | null;
  spread_line: number | null;
  spread_home_price: number | null;
  spread_away_price: number | null;
  total_points: number | null;
  over_price: number | null;
  under_price: number | null;
  pick_moneyline: string | null;
  pick_spread: string | null;
  pick_total: string | null;
  conf_moneyline: number | null;
  conf_spread: number | null;
  conf_total: number | null;
};

function fmtPrice(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}

function fmtNum(v: number | null) {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function toUTCDateStr(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LeaguePage({ league }: { league: "nfl" | "ncaaf" | "mlb" }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [games, setGames] = React.useState<Game[]>([]);

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = toUTCDateStr(new Date());
        const url = `/api/predict/latest?league=${league}&date=${today}&days=${league === "mlb" ? 7 : 14}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();
        if (!data?.ok) {
          throw new Error(data?.error || "Unknown error");
        }

        setGames(Array.isArray(data.games) ? data.games : []);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [league]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4 uppercase">{league} Games & Picks</h1>

      {loading && <div>Loading…</div>}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}
      {!loading && !error && games.length === 0 && <div>No games found.</div>}

      {!loading && !error && games.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-200">
              <tr>
                <th className="text-left px-3 py-2">Start (UTC)</th>
                <th className="text-left px-3 py-2">Matchup</th>
                <th className="text-left px-3 py-2">Moneyline</th>
                <th className="text-left px-3 py-2">Spread</th>
                <th className="text-left px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Model Picks</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.game_id} className="border-t border-neutral-800">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(g.start).toISOString().replace("T", " ").slice(0, 16)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{g.away} @ {g.home}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>Home: {fmtPrice(g.ml_home)}</div>
                    <div>Away: {fmtPrice(g.ml_away)}</div>
                  </td>
                  <td className="px-3 py-2">
                    {g.spread_line !== null ? (
                      <div>
                        Line: {g.spread_line} &nbsp;
                        <span className="text-xs text-neutral-400">
                          (H {fmtPrice(g.spread_home_price)} / A {fmtPrice(g.spread_away_price)})
                        </span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {g.total_points !== null ? (
                      <>
                        {fmtNum(g.total_points)} • O {fmtPrice(g.over_price)} / U {fmtPrice(g.under_price)}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div>
                      <div>
                        <span className="font-medium">ML:</span>{" "}
                        {g.pick_moneyline ?? "—"}{" "}
                        {g.conf_moneyline ? `(${g.conf_moneyline}%)` : ""}
                      </div>
                      <div>
                        <span className="font-medium">Spread:</span>{" "}
                        {g.pick_spread ?? "—"}{" "}
                        {g.conf_spread ? `(${g.conf_spread}%)` : ""}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span>{" "}
                        {g.pick_total ?? "—"}{" "}
                        {g.conf_total ? `(${g.conf_total}%)` : ""}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
