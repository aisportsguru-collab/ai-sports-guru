import fs from "fs";
import path from "path";
import { featurizeGame } from "./featurize";
import { baselineScore } from "./baseline";
import type { GameRow, ModelPick } from "../../backend/model/types";

/**
 * Optional: try to load a native booster at runtime only.
 * We use eval('require') so Next/Webpack won't try to resolve it at build time.
 */
function tryLoadNativeBooster(league: string) {
  try {
    const dynamicRequire: NodeRequire = eval("require");
    // If you ever vendor a Node booster that can read JSON models, point it here.
    const xgb = dynamicRequire("xgboost-node"); // only resolves at runtime on server, not during build
    const modelDir = path.join(process.cwd(), "backend", "model");
    // Prefer JSON if you export models in JSON in the future. Our current .bin files are from Python;
    // keep this here as a future hook. We'll fall back to baseline if it doesn't exist.
    const jsonPath = path.join(modelDir, `${league}_ml_xgb_v1.json`);
    if (fs.existsSync(jsonPath)) {
      const booster = xgb.Booster.loadModel(jsonPath);
      return { booster, kind: "xgboost-node-json" as const };
    }
  } catch {
    /* no-op; fall back below */
  }
  return null;
}

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Fallback prediction using our JS baseline features.
 * Returns probability for team1 winning (moneyline framing).
 */
function fallbackPredictProb(feats: Record<string, number>) {
  // A tiny logistic using a few stable, league-agnostic features we already compute.
  // Tweak weights as you like; these were chosen conservatively to avoid overfitting.
  const w: Record<string, number> = {
    // common features from featurizeGame()
    elo_diff: 0.010,           // 100 elo diff ≈ +1.0 logit
    rating_diff: 0.020,        // model rating difference
    off_def_diff: 0.015,       // (off_rating - def_rating) diff
    rest_diff: 0.050,          // extra rest day
    home: 0.200,               // home court/field bump
  };

  let z = 0;
  for (const [k, v] of Object.entries(w)) {
    if (Number.isFinite(feats[k])) z += (w[k] ?? 0) * (feats[k] as number);
  }
  return sigmoid(z);
}

export async function predictGames(
  league: "nfl" | "ncaaf" | "mlb",
  games: GameRow[]
): Promise<ModelPick[]> {
  const maybeNative = tryLoadNativeBooster(league);

  return games.map((g) => {
    const feats = featurizeGame(league, g);

    let p1 = fallbackPredictProb(feats); // default
    // In the future, if you export JSON models and deploy a compatible booster,
    // you can score with maybeNative here, e.g.:
    // if (maybeNative?.kind === "xgboost-node-json") {
    //   const fvec = Object.values(feats); // ensure stable order if your model expects it
    //   p1 = maybeNative.booster.predict(fvec); // pseudo-code; adapt to lib’s API
    // }

    // confidence % 0..100
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
      // keep extras for UI/diag
      features: feats,
      model: maybeNative ? maybeNative.kind : "baseline-logistic",
      ts: new Date().toISOString(),
    };
  });
}
