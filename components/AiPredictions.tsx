import React from "react";

type Props = {
  homeTeam: string;
  awayTeam: string;
  ai_ml_pick: string | null;      // "HOME" | "AWAY" | null
  ai_ml_conf: number | null;
  ai_spread_pick: string | null;  // e.g. "HOME -3.5", "AWAY +2", "PICK"
  ai_spread_conf: number | null;
  ai_total_pick: string | null;   // e.g. "OVER 47.5", "UNDER 46"
  ai_total_conf: number | null;
  total_points?: number | null;   // for optional display if needed
};

function clampConf(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return null;
  const v = Math.max(55, Math.min(100, Math.round(n)));
  return v;
}

function mlLabel(pick: string | null, home: string, away: string) {
  if (!pick) return null;
  return pick.toUpperCase() === "HOME" ? home : away;
}

// Spread pick comes as "HOME -3.5" or "AWAY +2" or "PICK"
function spreadLabel(pick: string | null, home: string, away: string) {
  if (!pick) return null;
  if (pick.toUpperCase() === "PICK") return "Pick'em";
  const [sideRaw, lineRaw] = pick.split(/\s+/, 2);
  const side = sideRaw?.toUpperCase();
  const team = side === "HOME" ? home : away;
  // ensure sign formatting
  let line = lineRaw ?? "";
  if (line && !/^[+-]/.test(line)) {
    const num = Number(line);
    if (Number.isFinite(num)) {
      line = (num >= 0 ? "+" : "") + String(num);
    }
  }
  return `${team} ${line}`;
}

// Total pick comes as "OVER 47.5" / "UNDER 46"
function totalLabel(pick: string | null) {
  if (!pick) return null;
  return pick.replace(/\s+(\-?\d+(\.\d+)?).*$/, " $1"); // normalize spacing
}

export default function AiPredictions({
  homeTeam,
  awayTeam,
  ai_ml_pick,
  ai_ml_conf,
  ai_spread_pick,
  ai_spread_conf,
  ai_total_pick,
  ai_total_conf,
}: Props) {
  const ml = mlLabel(ai_ml_pick, homeTeam, awayTeam);
  const mlc = clampConf(ai_ml_conf);

  const sp = spreadLabel(ai_spread_pick, homeTeam, awayTeam);
  const spc = clampConf(ai_spread_conf);

  const tp = totalLabel(ai_total_pick);
  const tpc = clampConf(ai_total_conf);

  const rows: { label: string; value: string | null; conf: number | null }[] = [
    { label: "Moneyline", value: ml, conf: mlc },
    { label: "Spread", value: sp, conf: spc },
    { label: "Total (O/U)", value: tp, conf: tpc },
  ];

  const hasAny = rows.some(r => r.value);

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-300">
        AI Predictions
      </div>
      {!hasAny ? (
        <div className="text-sm text-zinc-400">No predictions yet.</div>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{r.label}</span>
              <span className="text-zinc-100">
                {r.value ?? "—"}
                {r.value && r.conf != null ? (
                  <span className="ml-2 text-zinc-400">{r.conf}%</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
