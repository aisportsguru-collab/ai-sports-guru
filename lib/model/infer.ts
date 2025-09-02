import * as fs from "fs";
import * as path from "path";
import xgboost from "xgboost-node"; // needs npm install xgboost-node
import joblib from "joblib";        // needs npm install joblib

// Helper to resolve file path inside backend/model
function modelPath(file: string) {
  return path.join(process.cwd(), "backend/model", file);
}

export class Predictor {
  mlModel: any;
  mlIso: any;
  spreadModel: any;
  spreadIso: any;
  totalModel: any;
  totalIso: any;

  constructor() {
    // Load models
    this.mlModel = xgboost.loadModel(modelPath("nfl_ml_xgb_v1.bin"));
    this.mlIso = joblib.load(modelPath("nfl_ml_iso_v1.pkl"));
    this.spreadModel = xgboost.loadModel(modelPath("nfl_spread_xgb_v1.bin"));
    this.spreadIso = joblib.load(modelPath("nfl_spread_iso_v1.pkl"));
    this.totalModel = xgboost.loadModel(modelPath("nfl_total_xgb_v1.bin"));
    this.totalIso = joblib.load(modelPath("nfl_total_iso_v1.pkl"));
  }

  predict(features: number[]) {
    const f = new Float32Array(features);

    const rawML = this.mlModel.predict(f)[0];
    const calML = this.mlIso.predict([rawML])[0];

    const rawSpread = this.spreadModel.predict(f)[0];
    const calSpread = this.spreadIso.predict([rawSpread])[0];

    const rawTotal = this.totalModel.predict(f)[0];
    const calTotal = this.totalIso.predict([rawTotal])[0];

    return {
      moneyline: calML,
      spread: calSpread,
      total: calTotal,
    };
  }
}
