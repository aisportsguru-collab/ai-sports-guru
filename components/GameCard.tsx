"use client";
import type { ApiGame } from "@/lib/fetchGames";
import { american, formatSpreadWithTeam, formatTotals } from "@/lib/formatOdds";

function localTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "numeric", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  } catch { return iso; }
}

function pickToLabel(game: ApiGame, pick: string | null): string {
  if (!pick) return "—";
  const p = pick.trim().toUpperCase();
  // SPREAD strings can be "HOME -3.5" or "AWAY +2"
  if (p.startsWith("HOME")) {
    const rest = pick.slice(4).trim();
    return `${game.home_team}${rest ? " " + rest : ""}`;
  }
  if (p.startsWith("AWAY")) {
    const rest = pick.slice(4).trim();
    return `${game.away_team}${rest ? " " + rest : ""}`;
  }
  // TOTAL: "OVER 47.5" / "UNDER 47.5"
  if (p.startsWith("OVER") || p.startsWith("UNDER")) return pick;
  return pick;
}

export default function GameCard({ game }: { game: ApiGame }) {
  const time = localTime(game.game_time);

  const mlHome = american(game.moneyline_home);
  const mlAway = american(game.moneyline_away);
  const spread = formatSpreadWithTeam(game.home_team, game.away_team, game.spread_line);
  const totals = formatTotals(game.total_points, game.over_odds, game.under_odds);

  const mlPick = pickToLabel(game, game.ai_ml_pick);
  const spreadPick = pickToLabel(game, game.ai_spread_pick);
  const totalPick = game.ai_total_pick ?? (game.ai_total_number ? `OVER ${game.ai_total_number}` : null);

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 shadow-sm">
      <div className="text-xs opacity-70">{time}</div>

      <div className="mt-1 flex items-center justify-between gap-4">
        <div className="font-semibold">{game.away_team}</div>
        <div className="opacity-60 text-sm">at</div>
        <div className="font-semibold">{game.home_team}</div>
      </div>

      {/* Odds */}
      <div className="mt-4 rounded-xl bg-neutral-800/60 p-3 text-sm">
        <div className="font-medium mb-2 opacity-80">Odds</div>
        <div className="space-y-1 leading-6">
          <div>Moneyline: <span className="opacity-80">{game.home_team}</span> {mlHome}  <span className="opacity-60 mx-1">/</span>  <span className="opacity-80">{game.away_team}</span> {mlAway}</div>
          <div>Spread: <span className="opacity-80">{spread}</span></div>
          <div>Total: <span className="opacity-80">{totals}</span></div>
        </div>
      </div>

      {/* AI Predictions */}
      <div className="mt-3 rounded-xl bg-neutral-800/60 p-3 text-sm">
        <div className="font-medium mb-2 opacity-80">AI Predictions</div>
        <div className="space-y-1 leading-6">
          <div>
            Moneyline: <span className="opacity-80">
              {mlPick !== "—" ? `${mlPick} ${game.ai_ml_conf ? `(${game.ai_ml_conf}%)` : ""}` : "—"}
            </span>
          </div>
          <div>
            Spread: <span className="opacity-80">
              {spreadPick !== "—" ? `${spreadPick} ${game.ai_spread_conf ? `(${game.ai_spread_conf}%)` : ""}` : "—"}
            </span>
          </div>
          <div>
            Total: <span className="opacity-80">
              {totalPick ? `${totalPick} ${game.ai_total_conf ? `(${game.ai_total_conf}%)` : ""}` : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
