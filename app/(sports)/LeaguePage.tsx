"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";

type Game = {
  game_id: string;
  league: string;
  start: string; // ISO
  home: string;
  away: string;

  ml_home: number | null;
  ml_away: number | null;

  spread_line: number | null;              // home team line (home favored if negative)
  spread_home_price: number | null;
  spread_away_price: number | null;

  total_points: number | null;
  over_price: number | null;
  under_price: number | null;

  pick_moneyline: "HOME" | "AWAY" | null;
  pick_spread: string | null;   // e.g. "HOME -3.5"
  pick_total: string | null;    // e.g. "Over 47.5"

  conf_moneyline: number | null;
  conf_spread: number | null;
  conf_total: number | null;
};

function fmtSigned(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n > 0 ? `+${n}` : `${n}`;
}
function fmtPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n > 0 ? `+${n}` : `${n}`;
}
function clampConf(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  const c = Math.max(55, Math.min(100, Math.round(n)));
  return c;
}
function toLocalDate(dtISO: string): string {
  const d = new Date(dtISO);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function pickSideToTeam(
  pick: "HOME" | "AWAY" | "OVER" | "UNDER" | null,
  home: string,
  away: string
): string {
  if (pick === "HOME") return home;
  if (pick === "AWAY") return away;
  return pick ?? "—";
}
function parseSpreadPick(pick: string | null, home: string, away: string): string {
  if (!pick) return "—";
  const [side, line] = pick.split(/\s+/);
  const team = pickSideToTeam(side as "HOME" | "AWAY", home, away);
  return `${team} ${line ?? ""}`.trim();
}

function keyOf(g: Game) {
  return `${g.league}|${g.start}|${g.home}|${g.away}`;
}

export default function LeaguePage({
  league,
  title,
}: {
  league: "nfl" | "ncaaf" | "mlb";
  title: string;
}) {
  const [games, setGames] = useState<Game[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const url = `/api/predict/latest?league=${league}&date=${today}&days=14`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const raw: Game[] = json?.games ?? [];

      // de-dupe
      const seen = new Set<string>();
      const deduped: Game[] = [];
      for (const g of raw) {
        const k = keyOf(g);
        if (!seen.has(k)) {
          seen.add(k);
          deduped.push(g);
        }
      }
      setGames(deduped);
    };
    fetchData();
  }, [league]);

  const filtered = useMemo(() => {
    if (!games) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return games;
    return games.filter(
      (g) =>
        g.home.toLowerCase().includes(needle) ||
        g.away.toLowerCase().includes(needle)
    );
  }, [games, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title} Games &amp; Picks</h1>
      <p className="mt-2 text-sm text-zinc-400">Times shown in your local timezone.</p>

      <div className="mt-6 flex items-center justify-end">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by team…"
          className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {!games ? (
        <div className="mt-10 text-zinc-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 text-zinc-400">No games match your filter.</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((g) => {
            const cML = clampConf(g.conf_moneyline);
            const cSP = clampConf(g.conf_spread);
            const cTO = clampConf(g.conf_total);

            const homeSpread = g.spread_line ?? null;      // home relative
            const awaySpread = homeSpread == null ? null : -homeSpread;

            // availability guards for predictions
            const hasML = g.ml_home != null || g.ml_away != null;
            const hasSP = g.spread_line != null;
            const hasTO = g.total_points != null;

            return (
              <div
                key={keyOf(g)}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-xl shadow-black/20"
              >
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                  <div>{toLocalDate(g.start)}</div>
                  <div className="uppercase">{g.league}</div>
                </div>

                <div className="grid grid-cols-7 items-center gap-2">
                  <div className="col-span-3 text-lg font-medium">{g.home}</div>
                  <div className="col-span-1 text-center text-zinc-500">@</div>
                  <div className="col-span-3 text-lg font-medium text-right">{g.away}</div>
                </div>

                {/* Markets */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {/* Moneyline */}
                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">
                      Moneyline
                    </div>
                    <div className="text-sm">
                      <div>
                        <span className="text-zinc-400">{g.home}:</span>{" "}
                        <span className="font-medium">{fmtPrice(g.ml_home)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">{g.away}:</span>{" "}
                        <span className="font-medium">{fmtPrice(g.ml_away)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Spread */}
                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">
                      Spread
                    </div>
                    <div className="text-xs text-zinc-500 mb-1">
                      Line is shown relative to each team.
                    </div>
                    <div className="text-sm">
                      <div>
                        <span className="text-zinc-400">{g.home}:</span>{" "}
                        <span className="font-medium">
                          {homeSpread == null ? "—" : fmtSigned(homeSpread)}{" "}
                        </span>
                        <span className="text-zinc-500">
                          ({fmtPrice(g.spread_home_price)})
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400">{g.away}:</span>{" "}
                        <span className="font-medium">
                          {awaySpread == null ? "—" : fmtSigned(awaySpread)}{" "}
                        </span>
                        <span className="text-zinc-500">
                          ({fmtPrice(g.spread_away_price)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">
                      Total
                    </div>
                    <div className="text-sm">
                      <div>
                        <span className="text-zinc-400">Line:</span>{" "}
                        <span className="font-medium">
                          {g.total_points ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400">O / U:</span>{" "}
                        <span className="font-medium">
                          {fmtPrice(g.over_price)} / {fmtPrice(g.under_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Predictions */}
                <div className="mt-4 rounded-xl border border-emerald-900/40 bg-emerald-900/10 p-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                    AI Predictions
                  </div>
                  <div className="text-sm">
                    <div className="mb-1">
                      <span className="font-medium">Moneyline:</span>{" "}
                      {hasML && g.pick_moneyline
                        ? `${pickSideToTeam(g.pick_moneyline, g.home, g.away)}${
                            clampConf(g.conf_moneyline) ? ` (${clampConf(g.conf_moneyline)}%)` : ""
                          }`
                        : "—"}
                    </div>
                    <div className="mb-1">
                      <span className="font-medium">Spread:</span>{" "}
                      {hasSP && g.pick_spread
                        ? `${parseSpreadPick(g.pick_spread, g.home, g.away)}${
                            clampConf(g.conf_spread) ? ` (${clampConf(g.conf_spread)}%)` : ""
                          }`
                        : "—"}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span>{" "}
                      {hasTO && g.pick_total
                        ? `${g.pick_total}${
                            clampConf(g.conf_total) ? ` (${clampConf(g.conf_total)}%)` : ""
                          }`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
