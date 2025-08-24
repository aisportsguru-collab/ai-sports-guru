"use client";

import { useMemo } from "react";

type Row = {
  external_id?: string | null;
  game_id?: string | null;
  sport: string;
  season?: number | null;
  game_date?: string | null;
  commence_time?: string | null;
  home_team: string;
  away_team: string;

  // snapshot odds (canonical)
  moneyline_home?: number | null;
  moneyline_away?: number | null;
  spread_line?: number | null;
  spread_price_home?: number | null;
  spread_price_away?: number | null;
  total_line?: number | null;
  total_over_price?: number | null;
  total_under_price?: number | null;

  // picks
  predicted_winner?: string | null;  // legacy string team name
  pick_moneyline?: "HOME" | "AWAY" | string | null;
  pick_spread?: string | null;       // e.g. "HOME -3.5"
  pick_total?: string | null;        // e.g. "UNDER 214.5"
  conf_moneyline?: number | null;
  conf_spread?: number | null;
  conf_total?: number | null;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function badge(text: string) {
  return (
    <span className="rounded-xl border border-[#232632] bg-[#121317] px-2 py-1 text-xs text-[#A6A6A6]">
      {text}
    </span>
  );
}

export default function PredictionCard({ row }: { row: Row }) {
  const id = row.external_id ?? row.game_id ?? `${row.home_team}-${row.away_team}-${row.commence_time ?? ""}`;

  const startLabel = useMemo(() => fmtTime(row.commence_time), [row.commence_time]);

  // readable picks
  const mlPick = row.pick_moneyline
    ? (row.pick_moneyline.toUpperCase().startsWith("HOME") ? row.home_team
      : row.pick_moneyline.toUpperCase().startsWith("AWAY") ? row.away_team
      : row.pick_moneyline)
    : (row.predicted_winner || "");

  const spreadPick = row.pick_spread ?? "";
  const totalPick = row.pick_total ?? "";

  return (
    <article
      key={id}
      className="rounded-2xl border border-[#232632] bg-[#121317] p-5 shadow-sm transition hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[#A6A6A6] text-xs">{startLabel}</div>
          <h3 className="text-white text-lg font-semibold mt-1">
            {row.away_team} <span className="text-[#A6A6A6]">@</span> {row.home_team}
          </h3>
        </div>
        <div className="text-[#F5C847] text-sm font-semibold">{row.sport.toUpperCase()}</div>
      </div>

      {/* Odds strip */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#0B0B0B] border border-[#232632] p-3">
          <div className="text-[#A6A6A6] text-xs mb-1">Moneyline</div>
          <div className="text-white text-sm flex items-center gap-3">
            <span className="min-w-0 truncate">{row.home_team}</span>
            <span className="ml-auto">{row.moneyline_home ?? "—"}</span>
          </div>
          <div className="text-white text-sm flex items-center gap-3">
            <span className="min-w-0 truncate">{row.away_team}</span>
            <span className="ml-auto">{row.moneyline_away ?? "—"}</span>
          </div>
        </div>

        <div className="rounded-xl bg-[#0B0B0B] border border-[#232632] p-3">
          <div className="text-[#A6A6A6] text-xs mb-1">Spread</div>
          <div className="text-white text-sm flex items-center gap-3">
            <span className="min-w-0 truncate">{row.home_team}</span>
            <span className="ml-auto">
              {row.spread_line != null ? (row.spread_line >= 0 ? `+${row.spread_line}` : row.spread_line) : "—"}
              {row.spread_price_home != null ? ` (${row.spread_price_home})` : ""}
            </span>
          </div>
          <div className="text-white text-sm flex items-center gap-3">
            <span className="min-w-0 truncate">{row.away_team}</span>
            <span className="ml-auto">
              {row.spread_line != null ? (row.spread_line <= 0 ? `+${Math.abs(row.spread_line)}` : `-${row.spread_line}`) : "—"}
              {row.spread_price_away != null ? ` (${row.spread_price_away})` : ""}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-[#0B0B0B] border border-[#232632] p-3">
          <div className="text-[#A6A6A6] text-xs mb-1">Total</div>
          <div className="text-white text-sm flex items-center justify-between">
            <span>Line</span>
            <span className="ml-auto">{row.total_line ?? "—"}</span>
          </div>
          <div className="text-white text-sm flex items-center justify-between">
            <span>O / U</span>
            <span className="ml-auto">
              {(row.total_over_price ?? "—")} / {(row.total_under_price ?? "—")}
            </span>
          </div>
        </div>
      </div>

      {/* Picks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#232632] p-3 bg-[#0B0B0B]">
          <div className="text-[#A6A6A6] text-xs mb-1">Moneyline Pick</div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-white">{mlPick || "—"}</div>
            <div className="text-[#F5C847] text-xs font-semibold">
              {row.conf_moneyline != null ? badge(`${row.conf_moneyline}%`) : badge("—")}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#232632] p-3 bg-[#0B0B0B]">
          <div className="text-[#A6A6A6] text-xs mb-1">Spread Pick</div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-white">{spreadPick || "—"}</div>
            <div className="text-[#F5C847] text-xs font-semibold">
              {row.conf_spread != null ? badge(`${row.conf_spread}%`) : badge("—")}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#232632] p-3 bg-[#0B0B0B]">
          <div className="text-[#A6A6A6] text-xs mb-1">Total Pick</div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-white">{totalPick || "—"}</div>
            <div className="text-[#F5C847] text-xs font-semibold">
              {row.conf_total != null ? badge(`${row.conf_total}%`) : badge("—")}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
