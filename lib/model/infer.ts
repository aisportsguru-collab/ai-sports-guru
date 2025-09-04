import { featurizeGame } from "./featurize";

export async function createPredictor(league: string) {
  const mod = await import("./baseline");
  return new mod.BaselinePredictor(league);
}

export async function inferPreds(league: string, predictor: any, games: any[]) {
  return games.map((g) => {
    const feat = featurizeGame(league, g);
    const pHome = predictor.predict(feat); // P(home)
    const asg_pick = pHome >= 0.5 ? g.home_team : g.away_team;
    return { ...g, asg_prob: Number(pHome.toFixed(4)), asg_pick };
  });
}
