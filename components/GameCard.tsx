'use client';
import React from 'react';

type Props = { row: any };

const fmtConf = (x?: number | null) => {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  const v = x > 1 ? Math.round(x) : Math.round(x * 100);
  return `${v}%`;
};

function pickToTeam(pick: string | null | undefined, home: string, away: string) {
  if (!pick) return '—';
  const p = pick.toLowerCase();
  if (p === 'home' || p === home.toLowerCase()) return home;
  if (p === 'away' || p === away.toLowerCase()) return away;
  return pick; // already a team name (or something else)
}

export default function GameCard({ row }: Props) {
  const moneylineTeam = pickToTeam(row.moneyline_pick, row.home_team, row.away_team);
  const spreadTeam    = pickToTeam(row.spread_pick, row.home_team, row.away_team);
  const totalPick     = typeof row.total_pick === 'string' ? row.total_pick.toUpperCase() : '—';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black text-white p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-zinc-400">{row.sport}</div>
        <div className="text-xs text-zinc-400">{new Date(row.start_time).toLocaleString()}</div>
      </div>

      <div className="mt-3 grid gap-1">
        <div className="text-xl font-semibold">{row.away_team}</div>
        <div className="text-xl font-semibold">{row.home_team}</div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-zinc-900 p-4">
          <div className="text-xs text-zinc-400">Moneyline</div>
          <div className="text-sm text-zinc-400">
            Home {row.ml_price_home ?? '—'} / Away {row.ml_price_away ?? '—'}
          </div>
          <div className="mt-1 text-lg">
            Pick: <span className="font-bold text-amber-400">{moneylineTeam}</span>
            <div className="text-xs text-zinc-400 mt-1">Confidence {fmtConf(row.moneyline_conf)}</div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900 p-4">
          <div className="text-xs text-zinc-400">Spread</div>
          <div className="text-sm text-zinc-400">
            Line {row.spread_line ?? '—'} (H {row.spread_price_home ?? '—'} / A {row.spread_price_away ?? '—'})
          </div>
          <div className="mt-1 text-lg">
            Pick: <span className="font-bold text-amber-400">{spreadTeam}</span>
            <div className="text-xs text-zinc-400 mt-1">Confidence {fmtConf(row.spread_conf)}</div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900 p-4">
          <div className="text-xs text-zinc-400">Total</div>
          <div className="text-sm text-zinc-400">
            Line {row.total_line ?? row.pred_total_line ?? '—'} (O {row.total_over_price ?? '—'} / U {row.total_under_price ?? '—'})
          </div>
          <div className="mt-1 text-lg">
            Pick: <span className="font-bold text-amber-400">{totalPick}</span>
            <div className="text-xs text-zinc-400 mt-1">Confidence {fmtConf(row.total_conf)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
