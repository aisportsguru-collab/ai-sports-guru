"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Row = {
  external_id: string | null;
  game_date: string | null;
  home_team: string;
  away_team: string;
  commence_time: string | null;

  pick_moneyline: "HOME" | "AWAY" | null;
  pick_spread: string | null;
  pick_total: string | null;
  conf_moneyline: number | null;
  conf_spread: number | null;
  conf_total: number | null;
  rationale: string | null;

  moneyline_home: number | null;
  moneyline_away: number | null;
  spread_line: number | null;
  spread_price_home: number | null;
  spread_price_away: number | null;
  total_line: number | null;
  total_over_price: number | null;
  total_under_price: number | null;

  result_status?: "WIN" | "LOSE" | "PUSH" | null;
  season?: number | null;
};

type ApiResp = { data: Row[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };

function fmtMoney(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}
function fmtNum(v: number | null) {
  if (v === null || v === undefined) return "—";
  return String(v);
}
function safeDate(iso: string | null) {
  if (!iso) return "TBD";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "TBD";
  return new Date(iso).toLocaleString();
}
function badge(status?: string | null) {
  if (!status) return null;
  const base = "px-2 py-0.5 rounded text-xs";
  if (status === "WIN") return <span className={`${base} bg-green-600 text-white`}>WIN</span>;
  if (status === "LOSE") return <span className={`${base} bg-red-600 text-white`}>LOSE</span>;
  if (status === "PUSH") return <span className={`${base} bg-gray-500 text-white`}>PUSH</span>;
  return null;
}

export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();

  // URL state
  const [season, setSeason] = useState<number | "">(() => {
    const s = sp.get("season");
    return s ? Number(s) : new Date().getUTCFullYear();
  });
  const [date, setDate] = useState<string>(() => sp.get("date") || "");
  const [team, setTeam] = useState<string>(() => sp.get("team") || "");
  const [page, setPage] = useState<number>(() => Number(sp.get("page") || 1));
  const [pageSize, setPageSize] = useState<number>(() => Number(sp.get("pageSize") || 25));

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (season) p.set("season", String(season));
    if (date) p.set("date", date);
    if (team) p.set("team", team);
    if (page > 1) p.set("page", String(page));
    if (pageSize !== 25) p.set("pageSize", String(pageSize));
    return p.toString();
  }, [season, date, team, page, pageSize]);

  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<ApiResp["meta"]>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Fetch when filters/pagination change
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const url = `/api/predictions/mlb${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const json: ApiResp = await res.json();
      setRows(json.data || []);
      setMeta(json.meta || { page: 1, pageSize: 25, total: 0, totalPages: 1 });
      setLoading(false);
    };
    run();
    // keep URL in sync (shareable)
    router.replace(`/predictions/mlb${queryString ? `?${queryString}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // Season options (current and previous 3 for convenience)
  const seasonOptions = useMemo(() => {
    const curr = new Date().getUTCFullYear();
    return [curr + 1, curr, curr - 1, curr - 2, curr - 3].filter((y) => y <= curr + 1);
  }, []);

  const onApplyFilters = () => {
    setPage(1); // reset page when filters change
  };

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  if (loading && rows.length === 0) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">MLB Predictions</h1>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Season</label>
          <select
            className="w-full bg-black border border-gray-700 rounded px-3 py-2"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
          >
            {seasonOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Date (UTC)</label>
          <input
            type="date"
            className="w-full bg-black border border-gray-700 rounded px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Team</label>
          <input
            placeholder="Search team (home or away)…"
            className="w-full bg-black border border-gray-700 rounded px-3 py-2"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={onApplyFilters}
            className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded hover:bg-yellow-500 transition w-full"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th className="text-left p-3">Matchup</th>
              <th className="text-left p-3">Start</th>
              <th className="text-left p-3">Moneyline A,H</th>
              <th className="text-left p-3">Spread H (A,H)</th>
              <th className="text-left p-3">Total (O,U)</th>
              <th className="text-left p-3">Model Picks</th>
              <th className="text-left p-3">Conf</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const key = r.external_id || `${r.home_team}-${r.away_team}-${r.commence_time || i}`;
              return (
                <tr key={key} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">
                      {r.away_team} at {r.home_team}
                    </div>
                  </td>
                  <td className="p-3">{safeDate(r.commence_time)}</td>
                  <td className="p-3">
                    {fmtMoney(r.moneyline_away)} , {fmtMoney(r.moneyline_home)}
                  </td>
                  <td className="p-3">
                    {r.spread_line != null ? (
                      <>
                        {r.spread_line >= 0 ? "+" : ""}{r.spread_line}{" "}
                        <span className="text-gray-400">
                          ( {fmtMoney(r.spread_price_away)} , {fmtMoney(r.spread_price_home)} )
                        </span>
                      </>
                    ) : "—"}
                  </td>
                  <td className="p-3">
                    {r.total_line != null ? (
                      <>
                        {fmtNum(r.total_line)}{" "}
                        <span className="text-gray-400">
                          ( {fmtMoney(r.total_over_price)} , {fmtMoney(r.total_under_price)} )
                        </span>
                      </>
                    ) : "—"}
                  </td>
                  <td className="p-3">
                    <div>ML, {r.pick_moneyline ?? "—"}</div>
                    <div>Spread, {r.pick_spread ?? "—"}</div>
                    <div>Total, {r.pick_total ?? "—"}</div>
                    {r.rationale ? <div className="text-xs text-gray-500 mt-1">{r.rationale}</div> : null}
                  </td>
                  <td className="p-3">
                    <div>ML, {r.conf_moneyline ?? "—"}%</div>
                    <div>Spr, {r.conf_spread ?? "—"}%</div>
                    <div>Tot, {r.conf_total ?? "—"}%</div>
                  </td>
                  <td className="p-3">{badge(r.result_status)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr className="border-t"><td className="p-4 text-center text-gray-400" colSpan={8}>No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="text-sm text-gray-400">
          Showing {(meta.page - 1) * meta.pageSize + 1}
          {"–"}
          {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Page size</label>
          <select
            className="bg-black border border-gray-700 rounded px-2 py-1"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <button
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`px-3 py-2 rounded border ${canPrev ? "border-gray-600 hover:bg-gray-800" : "border-gray-800 text-gray-500 cursor-not-allowed"}`}
          >
            Prev
          </button>
          <span className="text-sm text-gray-400">
            Page {meta.page} / {meta.totalPages}
          </span>
          <button
            disabled={!canNext}
            onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-2 rounded border ${canNext ? "border-gray-600 hover:bg-gray-800" : "border-gray-800 text-gray-500 cursor-not-allowed"}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
