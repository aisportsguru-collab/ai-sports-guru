import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supa: SupabaseClient | null = null;

function getSupa(): SupabaseClient {
  if (_supa) return _supa;

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY at runtime.");
  }

  _supa = createClient(url, anon, { auth: { persistSession: false } });
  return _supa;
}

type GradeInput = {
  sport: string;              // 'mlb','nba','nfl',...
  game_date: string;          // 'YYYY-MM-DD' (UTC)
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  spread_close?: number | null;   // home negative (e.g., -1.5 means home favored by 1.5)
  total_close?: number | null;    // market total (e.g., 8.5)
};

function decideMoneyline(predictedWinner: "home" | "away", home_score: number, away_score: number) {
  const actual = home_score > away_score ? "home" : away_score > home_score ? "away" : "push";
  if (actual === "push") return "push";
  return predictedWinner === actual ? "win" : "loss";
}

function decideSpread(spread_pick: any, home_score: number, away_score: number, spread_close?: number | null) {
  if (!spread_pick || spread_pick?.team == null || (spread_pick?.line == null && spread_close == null)) return null;

  const pickTeam = spread_pick.team as "home" | "away";
  const line = typeof spread_pick.line === "number" ? spread_pick.line : (spread_close ?? null);
  if (line == null) return null;

  const margin = home_score - away_score; // home minus away
  const pickedHome = pickTeam === "home";
  const push = pickedHome ? margin + line === 0 : -margin + line === 0;
  if (push) return "push";

  const covered = pickedHome ? margin + line > 0 : -margin + line > 0;
  return covered ? "win" : "loss";
}

function decideTotal(ou_pick: any, home_score: number, away_score: number, total_close?: number | null) {
  if (!ou_pick || !ou_pick?.pick || (ou_pick?.total == null && total_close == null)) return null;

  const total = typeof ou_pick.total === "number" ? ou_pick.total : (total_close ?? null);
  if (total == null) return null;

  const points = home_score + away_score;
  if (points === total) return "push";
  if (ou_pick.pick?.toLowerCase() === "over") return points > total ? "win" : "loss";
  if (ou_pick.pick?.toLowerCase() === "under") return points < total ? "win" : "loss";
  return null;
}

/**
 * Upserts results into ai_research_predictions for the given finished games.
 * We match by sport + date + teams.
 */
export async function gradeResults(items: GradeInput[]) {
  if (!Array.isArray(items) || items.length === 0) return { ok: true, updated: 0 };

  const supa = getSupa();

  // Fetch candidate predictions for all dates in one go to minimize calls
  const byDate = Array.from(new Set(items.map(i => i.game_date)));
  const { data: preds, error } = await supa
    .from("ai_research_predictions")
    .select("id,sport,game_date,home_team,away_team,predicted_winner,spread_pick,ou_pick")
    .in("game_date", byDate);

  if (error) return { ok: false, step: "fetch", error };

  let updated = 0;

  for (const item of items) {
    const row = preds?.find(p =>
      p.sport === item.sport &&
      p.game_date === item.game_date &&
      p.home_team === item.home_team &&
      p.away_team === item.away_team
    );
    if (!row) continue;

    const ml = row.predicted_winner ? decideMoneyline(row.predicted_winner, item.home_score, item.away_score) : null;
    const sp = decideSpread(row.spread_pick, item.home_score, item.away_score, item.spread_close ?? null);
    const ou = decideTotal(row.ou_pick, item.home_score, item.away_score, item.total_close ?? null);

    // Simple numeric grade: moneyline counts 1, spread/total 0.5 each
    let score = 0;
    if (ml === "win") score += 1;
    if (sp === "win") score += 0.5;
    if (ou === "win") score += 0.5;

    const { error: uerr } = await supa
      .from("ai_research_predictions")
      .update({
        home_score: item.home_score,
        away_score: item.away_score,
        result_moneyline: ml,
        result_spread: sp,
        result_total: ou,
        grade: score,
        settled_at: new Date().toISOString(),
      })
      .eq("sport", item.sport)
      .eq("game_date", item.game_date)
      .eq("home_team", item.home_team)
      .eq("away_team", item.away_team);

    if (!uerr) updated++;
  }

  return { ok: true, updated };
}
