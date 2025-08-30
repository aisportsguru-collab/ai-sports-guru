import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type GamesByLeague = Record<string, Array<any>>;
type PredictionsBag = Record<string, any> | Array<any>;

function readJSON<T = any>(rel: string): T | null {
  const abs = path.join(process.cwd(), rel);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function mtime(rel: string): string | null {
  const abs = path.join(process.cwd(), rel);
  if (!fs.existsSync(abs)) return null;
  return fs.statSync(abs).mtime.toISOString();
}

function getPredForId(preds: PredictionsBag, id: string) {
  if (!preds) return null;
  if (Array.isArray(preds)) {
    const hit = preds.find((x) => x?.id === id) ?? preds.find((x) => x?.ai_prediction);
    return hit?.ai_prediction ?? hit ?? null;
  }
  const val = (preds as Record<string, any>)[id];
  return val?.ai_prediction ?? val ?? null;
}

const LABELS: Record<string, string> = {
  americanfootball_nfl: "NFL",
  americanfootball_ncaaf: "NCAAF",
  basketball_nba: "NBA",
  basketball_ncaab: "NCAAB",
  basketball_wnba: "WNBA",
  baseball_mlb: "MLB",
  icehockey_nhl: "NHL",
};

export async function GET() {
  const gamesPath = "backend/gamesData.json";
  const predsPath = "backend/predictionsData.json";

  const gamesData = readJSON<GamesByLeague>(gamesPath) ?? {};
  const predsData = readJSON<PredictionsBag>(predsPath) ?? {};

  const leagues = Object.keys(gamesData);
  const perLeague = leagues.map((sport_key) => {
    const arr = gamesData[sport_key] || [];
    let withPred = 0;
    for (const g of arr) {
      if (getPredForId(predsData, g.id)) withPred++;
    }
    return {
      sport_key,
      label: LABELS[sport_key] ?? sport_key,
      games: arr.length,
      withPredictions: withPred,
    };
  });

  const totals = perLeague.reduce(
    (acc, x) => {
      acc.games += x.games;
      acc.withPredictions += x.withPredictions;
      return acc;
    },
    { games: 0, withPredictions: 0 }
  );

  return NextResponse.json({
    ok: true,
    files: {
      gamesData: { path: gamesPath, exists: !!mtime(gamesPath), mtime: mtime(gamesPath) },
      predictionsData: { path: predsPath, exists: !!mtime(predsPath), mtime: mtime(predsPath) },
    },
    leagues: perLeague,
    totals,
  });
}
