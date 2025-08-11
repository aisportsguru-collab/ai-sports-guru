import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GradeInput = {
  sport: string;
  game_date: string;        // 'YYYY-MM-DD' (must match stored game_date)
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  // optional market numbers (if provided, used for grading spread/total
  // when our pick JSON lacked numbers)
  spread_close?: number | null; // line for the picked team if needed
  total_close?: number | null;  // market total if our pick didn't include total
};

function normTeam(s: string) {
  return s.trim();
}
function toDateKey(s: string) {
  return s.includes("T") ? s.slice(0,10) : s;
}
function mlWinner(home: string, away: string, hs: number, as: number) {
  if (hs === as) return "push"; // ties are rare, but handle it
  return hs > as ? home : away;
}
function gradeSpread(pickTeam: string, line: number, home: string, away: string, hs: number, as: number) {
  // Spread grading: (team_score + line) vs opponent_score
  const teamIsHome = pickTeam === home;
  const teamScore = teamIsHome ? hs : pickTeam === away ? as : null;
  const oppScore  = teamIsHome ? as : pickTeam === away ? hs : null;
  if (teamScore == null || oppScore == null) return { result: null as any, note: "pickTeam does not match home/away" };

  const adj = teamScore + line;
  if (Math.abs(adj - oppScore) < 1e-9) return { result: "push" as const, note: "adj == opp" };
  return { result: adj > oppScore ? "win" as const : "lose" as const, note: "spread graded" };
}
function gradeTotal(pick: "Over" | "Under", total: number, hs: number, as: number) {
  const sum = hs + as;
  if (Math.abs(sum - total) < 1e-9) return { result: "push" as const, note: "sum == total" };
  if (pick === "Over") return { result: sum > total ? "win" as const : "lose" as const, note: "OU graded" };
  return { result: sum < total ? "win" as const : "lose" as const, note: "OU graded" };
}

function normToken(s: string | null | undefined) {
  return (s ?? "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^['"]|['"]$/g, "");
}

function bad(body: any, status = 400) {
  return NextResponse.json(body, { status });
}
function ok(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
  return res;
}

export async function POST(req: Request) {
  // --- Secure with admin token (same as upsert endpoint)
  const adminEnv = process.env.PREDICTIONS_ADMIN_TOKEN || "";
  const admin = normToken(adminEnv);
  const headerToken = normToken(req.headers.get("x-admin-token")) || normToken(req.headers.get("authorization"));

  if (!admin || !headerToken || headerToken !== admin) {
    return bad({ error: "Unauthorized" }, 401);
  }

  // --- Supabase envs
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return bad({ error: "Server misconfigured" }, 500);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- Parse body
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return bad({ error: "Invalid JSON" }, 400);
  }

  const items: GradeInput[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.games)
    ? payload.games
    : typeof payload === "object" && payload
    ? [payload]
    : [];

  if (!items.length) {
    return bad({ error: "No games provided (array or {games:[...]})" }, 400);
  }

  const results: any[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const g = items[i];
    try {
      const sport = String(g.sport || "").toLowerCase().trim();
      const game_date = toDateKey(String(g.game_date || ""));
      const home_team = normTeam(String(g.home_team || ""));
      const away_team = normTeam(String(g.away_team || ""));
      const hs = Number(g.home_score);
      const as = Number(g.away_score);

      if (!sport || !game_date || !home_team || !away_team || !Number.isFinite(hs) || !Number.isFinite(as)) {
        errors.push({ index: i, error: "Missing required fields" });
        continue;
      }

      // Fetch the prediction row
      const { data: pred, error: selErr } = await supabase
        .from("ai_research_predictions")
        .select("*")
        .eq("sport", sport)
        .eq("game_date", game_date)
        .eq("home_team", home_team)
        .eq("away_team", away_team)
        .limit(1)
        .maybeSingle();

      if (selErr) {
        errors.push({ index: i, error: `Fetch failed: ${selErr.message}` });
        continue;
      }
      if (!pred) {
        errors.push({ index: i, error: "Prediction not found for keys" });
        continue;
      }

      // --- Grade moneyline
      const ml = mlWinner(home_team, away_team, hs, as);
      const mlResult = pred.predicted_winner
        ? (pred.predicted_winner === ml ? "win" : (ml === "push" ? "push" : "lose"))
        : null;

      // --- Grade spread (if we have a pick)
      let spResult: "win" | "lose" | "push" | null = null;
      let spNote = "no spread pick";

      if (pred.spread_pick) {
        const team = pred.spread_pick.team ?? pred.predicted_winner ?? "";
        const line = typeof pred.spread_pick.line === "number" ? pred.spread_pick.line
                   : typeof g.spread_close === "number" ? g.spread_close
                   : NaN;

        if (team && Number.isFinite(line)) {
          const graded = gradeSpread(team, line, home_team, away_team, hs, as);
          spResult = graded.result;
          spNote = graded.note;
        } else {
          spNote = "missing team/line";
        }
      } else if (typeof g.spread_close === "number" && pred.predicted_winner) {
        // Fallback: if no stored spread_pick but we know closing line and predicted_winner, grade on that
        const graded = gradeSpread(pred.predicted_winner, g.spread_close!, home_team, away_team, hs, as);
        spResult = graded.result;
        spNote = "graded via closing line + predicted_winner";
      }

      // --- Grade total (if we have a pick)
      let ouResult: "win" | "lose" | "push" | null = null;
      let ouNote = "no OU pick";
      if (pred.ou_pick && pred.ou_pick.pick && Number.isFinite(pred.ou_pick.total)) {
        const graded = gradeTotal(pred.ou_pick.pick, pred.ou_pick.total!, hs, as);
        ouResult = graded.result;
        ouNote = graded.note;
      } else if (typeof g.total_close === "number" && pred.ou_pick?.pick) {
        const graded = gradeTotal(pred.ou_pick.pick, g.total_close!, hs, as);
        ouResult = graded.result;
        ouNote = "graded via closing total";
      }

      // --- Update row
      const gradePayload = {
        inputs: {
          home_score: hs,
          away_score: as,
          spread_close: g.spread_close ?? null,
          total_close: g.total_close ?? null,
        },
        calc: {
          mlWinner: ml,
          notes: { spread: spNote, total: ouNote },
        },
      };

      const { error: upErr } = await supabase
        .from("ai_research_predictions")
        .update({
          result_moneyline: mlResult,
          result_spread: spResult,
          result_total: ouResult,
          settled_at: new Date().toISOString(),
          grade: gradePayload,
        })
        .eq("id", pred.id);

      if (upErr) {
        errors.push({ index: i, error: `Update failed: ${upErr.message}` });
        continue;
      }

      results.push({
        id: pred.id,
        sport,
        game_date,
        home_team,
        away_team,
        result_moneyline: mlResult,
        result_spread: spResult,
        result_total: ouResult,
      });
    } catch (e: any) {
      errors.push({ index: i, error: e?.message || "Unexpected error" });
    }
  }

  return ok({ ok: true, graded: results.length, results, errors });
}