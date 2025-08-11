"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Prediction = {
  id: string;
  sport: string;
  season: number;
  week: number | null;
  game_date: string;
  home_team: string;
  away_team: string;
  predicted_winner: string;
  confidence: number | null;
  offense_favor: string | null;
  defense_favor: string | null;
  key_players_home: string[] | null;
  key_players_away: string[] | null;
  spread_pick?: { team?: string; line?: number; edge?: number } | null;
  ou_pick?: { total?: number; pick?: "Over" | "Under"; edge?: number } | null;
  source_tag?: string | null;
  created_at?: string;
};

function pct(v: number | null | undefined) {
  if (v == null) return "—";
  const p = v <= 1 ? v * 100 : v;
  return `${p.toFixed(0)}%`;
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
function fmtLine(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "";
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "PK";
}
function fmtEdge(n?: number | null) {
  if (n == null) return "";
  const p = n <= 1 ? n * 100 : n;
  return ` (edge ${p.toFixed(0)}%)`;
}

export default function NCAAFPage() {
  const search = useSearchParams();
  const router = useRouter();

  const [season, setSeason] = useState<number>(Number(search.get("season") ?? 2025));
  const [week, setWeek] = useState<number>(Number(search.get("week") ?? 1));

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [rows, setRows] = useState<Prediction[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/predictions/ncaaf?season=${season}&week=${week}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        const list: Prediction[] = json.results ?? json.data ?? [];
        setRows(list);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          setError("Failed to load predictions.");
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [season, week]);

  const applyFilters = () => {
    router.push(`/ncaaf?season=${season}&week=${week}`);
  };

  return (
    <main className="bg-black text-white min-h-screen px-6 pb-24">
      <header className="pt-10 pb-6 border-b border-gray-800 mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold">NCAAF — AI Research Picks</h1>
        <p className="text-gray-400 mt-2">Moneyline, spread, and totals (if available).</p>
      </header>

      {/* Controls */}
      <section className="mb-6 flex flex-col md:flex-row items-start md:items-end gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Season</label>
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value || 0))}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 w-40"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Week</label>
          <input
            type="number"
            value={week}
            onChange={(e) => setWeek(Number(e.target.value || 0))}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 w-40"
          />
        </div>
        <button
          onClick={applyFilters}
          className="bg-yellow-400 text-black font-bold px-5 py-2 rounded-xl hover:bg-yellow-500 transition"
        >
          Apply
        </button>
      </section>

      {/* States */}
      {loading && <div className="text-gray-400">Loading predictions…</div>}
      {!loading && error && <div className="text-red-400">{error}</div>}
      {!loading && !error && rows.length === 0 && <div className="text-gray-400">No predictions found.</div>}

      {/* Table */}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto border border-gray-800 rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900">
              <tr className="text-left text-gray-300">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Away</th>
                <th className="px-4 py-3">Home</th>
                <th className="px-4 py-3">Predicted Winner</th>
                <th className="px-4 py-3">Conf.</th>
                <th className="px-4 py-3">Spread Pick</th>
                <th className="px-4 py-3">Total Pick</th>
                <th className="px-4 py-3">Offense – Favor</th>
                <th className="px-4 py-3">Defense – Favor</th>
                <th className="px-4 py-3">Key Players (Home)</th>
                <th className="px-4 py-3">Key Players (Away)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const spread =
                  r.spread_pick && (r.spread_pick.team || typeof r.spread_pick.line === "number")
                    ? `${r.spread_pick.team ?? ""} ${fmtLine(r.spread_pick.line)}${fmtEdge(r.spread_pick.edge)}`
                    : "—";
                const total =
                  r.ou_pick && r.ou_pick.pick && typeof r.ou_pick.total === "number"
                    ? `${r.ou_pick.pick} ${r.ou_pick.total}${fmtEdge(r.ou_pick.edge)}`
                    : "—";
                return (
                  <tr key={r.id} className="border-t border-gray-800 hover:bg-gray-900/40">
                    <td className="px-4 py-3">{fmtDate(r.game_date)}</td>
                    <td className="px-4 py-3">{r.away_team}</td>
                    <td className="px-4 py-3">{r.home_team}</td>
                    <td className="px-4 py-3 font-semibold">{r.predicted_winner}</td>
                    <td className="px-4 py-3">{pct(r.confidence)}</td>
                    <td className="px-4 py-3">{spread}</td>
                    <td className="px-4 py-3">{total}</td>
                    <td className="px-4 py-3">{r.offense_favor ?? "—"}</td>
                    <td className="px-4 py-3">{r.defense_favor ?? "—"}</td>
                    <td className="px-4 py-3">{r.key_players_home?.join(", ") || "—"}</td>
                    <td className="px-4 py-3">{r.key_players_away?.join(", ") || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-gray-500 text-xs mt-4">
        *For entertainment purposes only. No guarantees. Source: AI daily research.
      </p>
    </main>
  );
}
