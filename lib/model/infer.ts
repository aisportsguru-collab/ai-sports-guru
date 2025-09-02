import fs from "fs";
import path from "path";

/** Try to import the featurizer without making webpack choke if names change */
let featurizeGame: (league: "nfl"|"ncaaf"|"mlb", g: any) => Record<string, number>;
try {
  // Import all and pluck the symbol if present
  // (works whether featurizeGame is a named export or attached to default)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Feat = require("./featurize");
  featurizeGame =
    Feat.featurizeGame ??
    (Feat.default && Feat.default.featurizeGame) ??
    (() => ({}));
} catch {
  featurizeGame = (() => ({}));
}

/** Optional native booster hook (never required at build time) */
function tryLoadNativeBooster(league: string) {
  try {
    // Avoid bundler resolution
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicRequire: NodeRequire = eval("require");
    const xgb = dynamicRequire("xgboost-node"); // may not exist in prod; that's OK
    const modelDir = path.join(process.cwd(), "backend", "model");
    const jsonPath = path.join(modelDir, `${league}_ml_xgb_v1.json`);
    if (fs.existsSync(jsonPath)) {
      const booster = xgb.Booster.loadModel(jsonPath);
      return { booster, kind: "xgboost-node-json" as const };
    }
  } catch {
    /* noop */
  }
  return null;
}

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

/** Baseline logistic fallback using simple, stable features */
function fallbackPredictProb(feats: Record<string, number>) {
  const w: Record<string, number> = {
    elo_diff: 0.010,
    rating_diff: 0.020,
    off_def_diff: 0.015,
    rest_diff: 0.050,
    home: 0.200,
  };
  let z = 0;
  for (const [k, v] of Object.entries(w)) {
    const x = feats[k];
    if (Number.isFinite(x)) z += v * (x as number);
  }
  return sigmoid(z);
}

/** Primary API used by the app code now */
export async function predictGames(
  league: "nfl" | "ncaaf" | "mlb",
  games: any[]
) {
  const maybeNative = tryLoadNativeBooster(league);

  return games.map((g) => {
    const feats = featurizeGame(league, g);
    let p1 = fallbackPredictProb(feats);

    // If you later ship a JSON booster and a compatible runtime lib,
    // you can score with it here (left as a hook).
    // if (maybeNative?.kind === "xgboost-node-json") { ... }

    const confidence = Math.round(Math.abs(p1 - 0.5) * 200);
    return {
      league,
      gameId: g.game_id ?? g.id ?? `${g.team1_id}-${g.team2_id}-${g.game_date ?? ""}`,
      team1Id: g.team1_id,
      team2Id: g.team2_id,
      pickTeamId: p1 >= 0.5 ? g.team1_id : g.team2_id,
      probTeam1: p1,
      probTeam2: 1 - p1,
      confidence,
      features: feats,
      model: maybeNative ? maybeNative.kind : "baseline-logistic",
      ts: new Date().toISOString(),
    };
  });
}

/* ---------- Compatibility shims for existing routes ---------- */
/** Old name that routes import */
export async function inferPreds(
  league: "nfl" | "ncaaf" | "mlb",
  games: any[]
) {
  return predictGames(league, games);
}

/** Old class that routes construct (d.Predictor is not a constructor) */
export class Predictor {
  private league: "nfl" | "ncaaf" | "mlb";
  constructor(league: "nfl" | "ncaaf" | "mlb") {
    this.league = league;
  }
  async predict(games: any[]) {
    return predictGames(this.league, games);
  }
}
