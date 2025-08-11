"use client";

import React, { useEffect, useMemo, useState } from "react";

type SpreadPick = { team: string; line: number; edge?: number } | null;
type OuPick = { total: number; pick: "Over" | "Under"; edge?: number } | null;

type Prediction = {
  id: string;
  sport: string;
  season: number;
  week: number | null;
  game_date: string; // ISO date
  home_team: string;
  away_team: string;
  predicted_winner: string | null;
  confidence: number | null;
  spread_pick: SpreadPick;
  ou_pick: OuPick;
  offense_favor: string | null;
  defense_favor: string | null;
  key_players_home: string[] | null;
  key_players_away: string[] | null;
};

function fmtPct(v?: number | null) {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}
function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function PredictionsPage({
  sportKey,
  title,
  useWeek = false,
}: {
  sportKey: string;
  title: string;
  /** football uses weeks; others don’t */
  useWeek?: boolean;
}) {
  const thisYear = useMemo(() => new Date().getFullYear(), []);
  const [season, setSeason] = useState<number>(thisYear);
  const [week, setWeek] = useState<number>(1);
  const [rows, setRows] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Initialize from URL once (no useSearchParams -> no Suspense requirement)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("season");
    const w = sp.get("week");
    if (s && !Number.isNaN(+s)) setSeason(+s);
    if (useWeek && w && !Number.isNaN(+w)) setWeek(+w);
  }, [useWeek]);

  async function fetchRows(nextSeason = season, nextWeek = week) {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ season: String(nextSeason) });
      if (useWeek) qs.set("week", String(nextWeek));
      const res = await fetch(`/api/predictions/${sportKey}?` + qs.toString(), {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setRows(Array.isArray(data?.data) ? data.data : data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load predictions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportKey]);

  function applyFilters() {
    // update URL (nice for sharing)
    const sp = new URLSearchParams();
    sp.set("season", String(season));
    if (useWeek) sp.set("week", String(week));
    const url = `${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState(null, "", url);

    fetchRows(season, week);
  }

  return (
    <main className="bg-black text-white min-h-screen px-6 pb-24">
      <section className="max-w-6xl mx-auto pt-16">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{title}</h1>
        <p className="text-gray-400 mb-8">
          Moneyline, spread, and totals (if available).
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center mb-8">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Season</label>
            <input
              type="number"
              className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 w-28"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value || String(thisYear), 10))}
            />
          </div>

          {useWeek && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Week</label>
              <input
                type="number"
                className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 w-20"
                value={week}
                onChange={(e) => setWeek(parseInt(e.target.value || "1", 10))}
              />
            </div>
          )}

          <button
            onClick={applyFilters}
            className="bg-yellow-400 text-black font-semibold rounded-xl px-6 py-2 hover:bg-yellow-500 transition"
          >
            Apply
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="min-w-full bg-gray-950">
            <thead className="text-sm uppercase text-gray-400 bg-gray-900">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Away</th>
                <th className="p-3 text-left">Home</th>
                <th className="p-3 text-left">Predicted Winner</th>
                <th className="p-3 text-left">Conf.</th>
                <th className="p-3 text-left">Spread Pick</th>
                <th className="p-3 text-left">Total Pick</th>
                <th className="p-3 text-left">Offense – Favor</th>
                <th className="p-3 text-left">Defense – Favor</th>
                <th className="p-3 text-left">Key Players (Home)</th>
                <th className="p-3 text-left">Key Players (Away)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && (
                <tr>
                  <td className="p-4 text-gray-400" colSpan={11}>
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && err && (
                <tr>
                  <td className="p-4 text-red-400" colSpan={11}>
                    {err}
                  </td>
                </tr>
              )}

              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-400" colSpan={11}>
                    No predictions found.
                  </td>
                </tr>
              )}

              {!loading &&
                !err &&
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="p-3 text-gray-300">{fmtDate(r.game_date)}</td>
                    <td className="p-3">{r.away_team}</td>
                    <td className="p-3">{r.home_team}</td>
                    <td className="p-3 font-semibold">
                      {r.predicted_winner ?? "—"}
                    </td>
                    <td className="p-3 text-gray-300">
                      {fmtPct(r.confidence)}
                    </td>
                    <td className="p-3">
                      {r.spread_pick
                        ? `${r.spread_pick.team} ${r.spread_pick.line > 0 ? "+" : ""}${r.spread_pick.line
                          }${r.spread_pick.edge != null ? ` (edge ${fmtPct(r.spread_pick.edge)})` : ""}`
                        : "—"}
                    </td>
                    <td className="p-3">
                      {r.ou_pick
                        ? `${r.ou_pick.pick} ${r.ou_pick.total
                          }${r.ou_pick.edge != null ? ` (edge ${fmtPct(r.ou_pick.edge)})` : ""}`
                        : "—"}
                    </td>
                    <td className="p-3 text-gray-300">
                      {r.offense_favor ?? "—"}
                    </td>
                    <td className="p-3 text-gray-300">
                      {r.defense_favor ?? "—"}
                    </td>
                    <td className="p-3 text-gray-300">
                      {(r.key_players_home ?? []).join(", ") || "—"}
                    </td>
                    <td className="p-3 text-gray-300">
                      {(r.key_players_away ?? []).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          *For entertainment purposes only. No guarantees. Source: AI daily
          research.
        </p>
      </section>
    </main>
  );
}
