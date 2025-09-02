import React from "react";

export const dynamic = "force-dynamic";

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
  model_confidence: number | null;
  predicted_winner: string | null;
};

type ApiLatest = {
  ok: boolean;
  league: string;
  date: string;
  days: number;
  games: Game[];
  error?: string;
};

const SUPPORTED = new Set(["nfl", "ncaaf", "mlb"]);

function fmtMoneyline(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}
function fmtPrice(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}
function fmtNum(v: number | null, digits = 1) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(digits);
}

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: { league: string };
  searchParams: { date?: string; days?: string };
}) {
  const league = (params.league || "").toLowerCase();
  if (!SUPPORTED.has(league)) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Unsupported league</h1>
        <p className="text-sm text-gray-500">Try /nfl, /ncaaf, or /mlb.</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const date = searchParams.date || today;
  const days = Number(searchParams.days || 14);

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const url = `${base}/api/predict/latest?league=${league}&date=${date}&days=${days}`;

  const res = await fetch(url, { cache: "no-store" });
  let payload: ApiLatest | null = null;
  try {
    payload = (await res.json()) as ApiLatest;
  } catch {
    payload = null;
  }

  if (!payload?.ok) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold uppercase">{league}</h1>
        <p className="mt-2 text-red-600">
          Failed to load predictions. {payload?.error || `Status ${res.status}`}
        </p>
      </div>
    );
  }

  const games = payload.games || [];
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold uppercase">{league}</h1>
          <p className="text-sm text-gray-500">
            Window: {payload.date} → +{payload.days} days • {games.length} games
          </p>
        </div>
        <div className="text-sm text-gray-500">
          <a
            href={`/api/predict/latest?league=${league}&date=${date}&days=${days}`}
            className="underline"
          >
            Raw JSON
          </a>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="mt-8 rounded-lg border border-gray-200 p-6">
          No games found in the selected window.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Start (UTC)</th>
                <th className="px-3 py-2">Matchup</th>
                <th className="px-3 py-2">ML (H/A)</th>
                <th className="px-3 py-2">Spread / Prices</th>
                <th className="px-3 py-2">Total / Prices</th>
                <th className="px-3 py-2">Model Picks</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.game_id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(g.start).toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{g.away} @ {g.home}</div>
                    <div className="text-xs text-gray-500">{g.game_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-3 py-2">
                    {fmtMoneyline(g.ml_home)} / {fmtMoneyline(g.ml_away)}
                  </td>
                  <td className="px-3 py-2">
                    {g.spread_line === null ? "—" : (
                      <>
                        {fmtNum(g.spread_line)} • H {fmtPrice(g.spread_home_price)} / A {fmtPrice(g.spread_away_price)}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {g.total_points === null ? "—" : (
                      <>
                        {fmtNum(g.total_points)} • O {fmtPrice(g.over_price)} / U {fmtPrice(g.under_price)}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div>
                      <div><span className="font-medium">ML:</span> {g.pick_moneyline ?? "—"} {g.conf_moneyline ? `(${g.conf_moneyline}%)` : ""}</div>
                      <div><span className="font-medium">Spread:</span> {g.pick_spread ?? "—"} {g.conf_spread ? `(${g.conf_spread}%)` : ""}</div>
                      <div><span className="font-medium">Total:</span> {g.pick_total ?? "—"} {g.conf_total ? `(${g.conf_total}%)` : ""}</div>
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
