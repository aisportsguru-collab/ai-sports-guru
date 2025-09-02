"use client";

import { useEffect, useMemo, useState } from "react";

type League = "nfl" | "ncaaf" | "mlb";

type ApiGame = {
  game_id: string | null;
  league: League;
  start: string; // ISO
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

function fmtAmerican(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 0 ? `+${n}` : `${n}`;
}

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n > 0 ? `+${n}` : `${n}`;
}

function formatLocalTime(iso: string) {
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(dt);
  } catch {
    return iso;
  }
}

function dedupe(games: ApiGame[]): ApiGame[] {
  const seen = new Set<string>();
  const out: ApiGame[] = [];
  for (const g of games) {
    const key =
      (g.game_id ?? "") ||
      `${g.league}|${g.start}|${g.home}|${g.away}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out;
}

function useFetchGames(league: League, days = 14) {
  const [games, setGames] = useState<ApiGame[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `/api/predict/latest?league=${league}&date=${today}&days=${days}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.ok !== true) throw new Error("API returned not ok");
        const deduped = dedupe(json.games ?? []);
        if (isMounted) setGames(deduped);
      } catch (e: any) {
        if (isMounted) setErr(e?.message || "Failed to load");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [league, days]);

  return { games, err, loading };
}

export default function LeaguePage({
  league,
  title,
}: {
  league: League;
  title: string;
}) {
  const { games, err, loading } = useFetchGames(league);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!games) return [];
    if (!q.trim()) return games;
    const needle = q.trim().toLowerCase();
    return games.filter(
      (g) =>
        g.home.toLowerCase().includes(needle) ||
        g.away.toLowerCase().includes(needle)
    );
  }, [games, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
        {title} Games & Picks
      </h1>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Times shown in your local timezone.
        </p>
        <div className="w-full md:w-80">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by team…"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2 outline-none ring-0 focus:border-zinc-400"
          />
        </div>
      </div>

      {loading && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/40 h-40"
            />
          ))}
        </div>
      )}

      {!loading && err && (
        <div className="mt-8 text-red-400">Error: {err}</div>
      )}

      {!loading && !err && filtered.length === 0 && (
        <div className="mt-8 text-zinc-400">No games found.</div>
      )}

      {!loading && !err && filtered.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((g) => (
            <div
              key={(g.game_id ?? "") + g.start + g.home + g.away}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
                <div className="text-sm text-zinc-400">
                  {formatLocalTime(g.start)}
                </div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  {g.league}
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="text-base md:text-lg font-medium text-right">
                    {g.away}
                  </div>
                  <div className="text-center text-xs text-zinc-500 uppercase">
                    @
                  </div>
                  <div className="text-base md:text-lg font-medium">
                    {g.home}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="text-xs uppercase text-zinc-500">
                      Moneyline
                    </div>
                    <div className="mt-1">
                      <div>Home: {fmtAmerican(g.ml_home)}</div>
                      <div>Away: {fmtAmerican(g.ml_away)}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="text-xs uppercase text-zinc-500">
                      Spread
                    </div>
                    <div className="mt-1">
                      <div>
                        Line: {g.spread_line != null ? ` ${g.spread_line}` : "—"}
                      </div>
                      <div className="text-xs text-zinc-400">
                        H {fmtPrice(g.spread_home_price)} / A{" "}
                        {fmtPrice(g.spread_away_price)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 p-3">
                    <div className="text-xs uppercase text-zinc-500">
                      Total
                    </div>
                    <div className="mt-1">
                      <div>{g.total_points != null ? g.total_points : "—"}</div>
                      <div className="text-xs text-zinc-400">
                        O {fmtPrice(g.over_price)} / U {fmtPrice(g.under_price)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-900/50 bg-emerald-900/10 p-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-300">
                    AI Predictions
                  </div>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Moneyline:</span>{" "}
                      {g.pick_moneyline ?? "—"}
                      {g.conf_moneyline ? ` (${g.conf_moneyline}%)` : ""}
                    </div>
                    <div>
                      <span className="font-medium">Spread:</span>{" "}
                      {g.pick_spread ?? "—"}
                      {g.conf_spread ? ` (${g.conf_spread}%)` : ""}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span>{" "}
                      {g.pick_total ?? "—"}
                      {g.conf_total ? ` (${g.conf_total}%)` : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
