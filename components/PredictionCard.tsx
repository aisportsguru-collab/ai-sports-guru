import React from "react";

// If these types/helpers live elsewhere, keep the imports you had.
// This file only fixes the call-site & typing to avoid TS errors.
type PickSide = "home" | "away" | "over" | "under";

function formatSpreadWithTeam(
  pickSide: PickSide,
  homeTeam: string,
  awayTeam: string,
  spreadLine: number | null | undefined
) {
  // simple placeholder format — keep your original implementation if you had one
  const team = pickSide === "home" ? homeTeam : pickSide === "away" ? awayTeam : "";
  return spreadLine != null ? `${team} ${spreadLine}` : team;
}

type Props = { g: any };

export default function PredictionCard({ g }: Props) {
  const spreadLineNum =
    typeof g?.spread_line === "string" ? parseFloat(g.spread_line) : (g?.spread_line as number | undefined);

  const spreadPick = formatSpreadWithTeam(
    (g?.ai_spread_pick as PickSide) ?? "home",
    g?.home_team ?? "",
    g?.away_team ?? "",
    Number.isFinite(spreadLineNum as number) ? (spreadLineNum as number) : null
  );

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-sm text-gray-500">{g?.home_team} vs {g?.away_team}</div>
      <div className="font-medium">{spreadPick}</div>
    </div>
  );
}
