import React from "react";

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
  conf_moneyline?: number | null;
  conf_spread?: number | null;
  conf_total?: number | null;
};

const fmtPrice = (n: number | null) =>
  typeof n === "number" ? (n > 0 ? `+${n}` : `${n}`) : "—";
const fmtNum = (n: number | null) => (typeof n === "number" ? n.toFixed(1) : "—");
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

async function getGames(league: "nfl" | "ncaaf" | "mlb") {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(
    `/api/predict/latest?league=${league}&date=${today}&days=14`,
    { cache: "no-store" }
  );
  if (!res.ok) return { ok: false, games: [] as Game[] };
  return res.json() as Promise<{ ok: boolean; games: Game[] }>;
}

export default async function LeaguePage({ league }: { league: "nfl" | "ncaaf" | "mlb" }) {
  const { ok, games } = await getGames(league);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">
        {league.toUpperCase()} Predictions (14 days)
      </h1>

      {!ok ? (
        <p className="text-red-500">Couldn’t load data.</p>
      ) : games.length === 0 ? (
        <p>No games found in the window.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow border border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900/60">
              <tr>
                <th className="text-left px-3 py-2">Kickoff</th>
                <th className="text-left px-3 py-2">Matchup</th>
                <th className="text-left px-3 py-2">Moneyline</th>
                <th className="text-left px-3 py-2">Spread</th>
                <th className="text-left px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Our Picks</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.game_id} className="border-t border-neutral-800">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtTime(g.start)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{g.away}</div>
                    <div>@ {g.home}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>Home {fmtPrice(g.ml_home)}</div>
                    <div>Away {fmtPrice(g.ml_away)}</div>
                  </td>
                  <td className="px-3 py-2">
                    {g.spread_line == null ? (
                      "—"
                    ) : (
                      <>
                        {g.spread_line > 0 ? `+${g.spread_line}` : g.spread_line}{" "}
                        (H {fmtPrice(g.spread_home_price)} / A {fmtPrice(g.spread_away_price)})
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {g.total_points == null ? (
                      "—"
                    ) : (
                      <>
                        {fmtNum(g.total_points)} • O {fmtPrice(g.over_price)} / U {fmtPrice(g.under_price)}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div>
                      <div>
                        <span className="font-medium">ML:</span> {g.pick_moneyline ?? "—"}{" "}
                        {g.conf_moneyline ? `(${g.conf_moneyline}%)` : ""}
                      </div>
                      <div>
                        <span className="font-medium">Spread:</span> {g.pick_spread ?? "—"}{" "}
                        {g.conf_spread ? `(${g.conf_spread}%)` : ""}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> {g.pick_total ?? "—"}{" "}
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

export const dynamic = "force-dynamic";
