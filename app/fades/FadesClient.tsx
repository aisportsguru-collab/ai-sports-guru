"use client";

import { useMemo } from "react";
import { american, formatSpreadWithTeam } from "@/lib/formatOdds";

type Row = {
  home_team: string;
  away_team: string;
  ml_home_latest?: number | string | null;
  ml_away_latest?: number | string | null;
  spread_latest?: number | string | null;
  total_latest?: number | string | null;
};

export default function FadesClient({ rows = [], initial }: { rows?: Row[]; initial?: any }) {
  const list = useMemo(() => rows ?? [], [rows]);

  const fmtHalfStep = (v: number | string | null | undefined) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!isFinite(n)) return "—";
    return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)).replace(/\.0$/, "");
  };

  return (
    <div className="space-y-3">
      {list.map((r, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-neutral-800 bg-black/30 p-4 grid gap-2 text-sm"
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {r.away_team} @ {r.home_team}
            </div>
          </div>

          <div>
            {r.home_team} {american(Number(r.ml_home_latest))} • {r.away_team} {american(Number(r.ml_away_latest))}
          </div>

          <div>{formatSpreadWithTeam(r.home_team, r.away_team, Number(r.spread_latest))}</div>

          <div>O/U {fmtHalfStep(r.total_latest)}</div>
        </div>
      ))}
    </div>
  );
}
