"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";

type SpreadPick = { team: string; line: number; edge: number } | null;
type OuPick = { total: number; pick: "Over" | "Under"; edge: number } | null;

export type PredictionRow = {
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

type Props = {
  sport: string;
  title: string;
  defaultSeason?: number;
  defaultWeek?: number;
  isWeekly?: boolean;      // true for NFL/NCAAF, false for daily leagues
  showControls?: boolean;  // hide filters on public pages
};

function formatPct(n?: number | null) {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

function formatEdge(n?: number | null) {
  if (n == null) return "—";
  return `edge ${Math.round(n * 100)}%`;
}

function niceDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function fetchPredictions(
  sport: string,
  season: number,
  week?: number
): Promise<PredictionRow[]> {
  const qs = new URLSearchParams({ season: String(season) });
  if (typeof week === "number") qs.set("week", String(week));
  const res = await fetch(`/api/predictions/${sport}?` + qs.toString(), {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data ?? [];
}

function Inner({
  sport,
  title,
  defaultSeason,
  defaultWeek,
  isWeekly,
  showControls,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const initialSeason = defaultSeason ?? now.getFullYear();
  const [season, setSeason] = useState<number>(initialSeason);
  const [week, setWeek] = useState<number | undefined>(
    isWeekly ? defaultWeek ?? 1 : undefined
  );
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPredictions(sport, season, isWeekly ? week : undefined)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sport, season, week, isWeekly]);

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto min-h-screen bg-black text-white">
      <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-6">
        {title}
      </h1>
      <p className="text-sm text-gray-400 mb-8">
        Moneyline, spread, and totals (if available).
      </p>

      {/* Optional controls (hidden on public pages) */}
      {showControls && (
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Season</label>
            <input
              type="number"
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 w-24"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value || "0", 10))}
            />
          </div>

          {isWeekly && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Week</label>
              <input
                type="number"
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 w-20"
                value={week ?? 1}
                onChange={(e) => setWeek(parseInt(e.target.value || "1", 10))}
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0c1118]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#0e1522] text-gray-300">
            <tr className="divide-x divide-gray-800">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Away</th>
              <th className="px-4 py-3 text-left">Home</th>
              <th className="px-4 py-3 text-left">Predicted Winner</th>
              <th className="px-4 py-3 text-left">Conf.</th>
              <th className="px-4 py-3 text-left">Spread Pick</th>
              <th className="px-4 py-3 text-left">Total Pick</th>
              <th className="px-4 py-3 text-left">Offense — Favor</th>
              <th className="px-4 py-3 text-left">Defense — Favor</th>
              <th className="px-4 py-3 text-left">Key Players (Home)</th>
              <th className="px-4 py-3 text-left">Key Players (Away)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-gray-200">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-gray-400" colSpan={11}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-gray-400" colSpan={11}>
                  No predictions found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="divide-x divide-gray-800">
                  <td className="px-4 py-3">{niceDate(r.game_date)}</td>
                  <td className="px-4 py-3">{r.away_team}</td>
                  <td className="px-4 py-3">{r.home_team}</td>
                  <td className="px-4 py-3 font-semibold">
                    {r.predicted_winner ?? "—"}
                  </td>
                  <td className="px-4 py-3">{formatPct(r.confidence)}</td>
                  <td className="px-4 py-3">
                    {r.spread_pick
                      ? `${r.spread_pick.team} ${
                          r.spread_pick.line > 0
                            ? `+${r.spread_pick.line}`
                            : r.spread_pick.line
                        } (${formatEdge(r.spread_pick.edge)})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.ou_pick
                      ? `${r.ou_pick.pick} ${r.ou_pick.total} (${formatEdge(
                          r.ou_pick.edge
                        )})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{r.offense_favor ?? "—"}</td>
                  <td className="px-4 py-3">{r.defense_favor ?? "—"}</td>
                  <td className="px-4 py-3">
                    {(r.key_players_home ?? []).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {(r.key_players_away ?? []).join(", ") || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 text-center mt-6">
        *For entertainment purposes only. No guarantees. Source: AI daily
        research.
      </p>
    </section>
  );
}

export default function PredictionsPage(props: Props) {
  // Next 15 requires suspense around client hooks used inside trees.
  return (
    <Suspense fallback={<section className="py-12 px-4 max-w-6xl mx-auto text-gray-400">Loading…</section>}>
      <Inner {...props} />
    </Suspense>
  );
}
