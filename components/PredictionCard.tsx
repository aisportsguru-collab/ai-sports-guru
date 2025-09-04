"use client";

import { american, sideToTeam, formatSpreadPick, formatTotalPick } from "@/lib/formatOdds";

type Game = {
  game_id: string;
  game_time: string;
  league: string;
  away_team: string;
  home_team: string;
  moneyline_away: number | null;
  moneyline_home: number | null;
  spread_line: number | null;  // home line (negative means home favored)
  total_points: number | null;
  over_odds: number | null;
  under_odds: number | null;

  ai_ml_pick: string | null;       // "HOME" | "AWAY"
  ai_ml_conf: number | null;       // 0-100
  ai_spread_pick: string | null;   // "HOME -3" | "AWAY +2.5" | "PICK"
  ai_spread_conf: number | null;
  ai_total_pick: string | null;    // "OVER 47.5" | "UNDER 44"
  ai_total_conf: number | null;
  ai_total_number: number | null;  // modeled total if you computed one
};

export default function PredictionCard({ g }: { g: Game }) {
  const t = new Date(g.game_time);

  const mlHome = american(g.moneyline_home);
  const mlAway = american(g.moneyline_away);

  const spreadHome =
    typeof g.spread_line === "number"
      ? `${g.home_team} ${g.spread_line > 0 ? `+${g.spread_line}` : g.spread_line}`
      : "—";

  const total =
    typeof g.total_points === "number"
      ? `Over ${g.total_points} ${american(g.over_odds)}  /  Under ${g.total_points} ${american(g.under_odds)}`
      : "—  /  —";

  const mlPickTeam = sideToTeam(g.ai_ml_pick, g.home_team, g.away_team);
  const spreadPick = formatSpreadPick(g.ai_spread_pick, g.home_team, g.away_team);
  const totalPick = formatTotalPick(g.ai_total_pick);

  return (
    <div className="card space-y-3">
      <div className="row">
        <div className="text-sm text-neutral-400">
          {t.toLocaleString()}
        </div>
        <div className="text-right text-sm text-neutral-400">{g.league.toUpperCase()}</div>
      </div>

      <div className="row text-lg font-semibold">
        <div>{g.away_team}</div>
        <div className="text-neutral-400">at</div>
        <div>{g.home_team}</div>
      </div>

      {/* Odds */}
      <div className="space-y-1">
        <div className="label">Odds</div>
        <div className="subtle">
          Moneyline: <span className="value">{g.home_team} {mlHome}</span>
          <span className="mx-2"> / </span>
          <span className="value">{g.away_team} {mlAway}</span>
        </div>
        <div className="subtle">
          Spread: <span className="value">{spreadHome}</span>
        </div>
        <div className="subtle">
          Total: <span className="value">{total}</span>
        </div>
      </div>

      {/* AI Predictions */}
      <div className="space-y-1">
        <div className="label">AI Predictions</div>
        <div className="subtle">
          Moneyline:{" "}
          <span className="value">
            {mlPickTeam ? `${mlPickTeam}${g.ai_ml_conf ? ` (${g.ai_ml_conf}%)` : ""}` : "—"}
          </span>
        </div>
        <div className="subtle">
          Spread:{" "}
          <span className="value">
            {spreadPick ? `${spreadPick}${g.ai_spread_conf ? ` (${g.ai_spread_conf}%)` : ""}` : "—"}
          </span>
        </div>
        <div className="subtle">
          Total:{" "}
          <span className="value">
            {totalPick ? `${totalPick}${g.ai_total_conf ? ` (${g.ai_total_conf}%)` : ""}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
