import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import OpenAI from "openai";
import env from "./env.mjs";

env.requireEnv([
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_THE_ODDS_API_KEY",
]);

const ODDS_API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const gamesFile = path.resolve("backend/gamesData.json");
const predictionsFile = path.resolve("backend/predictionsData.json");

function loadJSON(file) {
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  return {};
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function fetchOdds(sportKey, daysFrom = 7) {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?daysFrom=${daysFrom}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${ODDS_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch odds: ${response.statusText}`);
  return await response.json();
}

function buildPrompt(game) {
  const sample = JSON.stringify(game.bookmakers?.[0]?.markets ?? [], null, 2);
  return `
You are an expert US sports betting model. Use the odds snapshot to recommend:
- moneyline winner (team string exactly as listed),
- spread pick "Team +/-X.X"
- total "Over/Under X.X"
- confidence 1–100
Return strict JSON only:

{"moneyline":"Team","spread":"Team +/-X.X","total":"Over/Under X.X","confidence":75}

Match: ${game.away_team} @ ${game.home_team}
Markets (first book):
${sample}
`.trim();
}

async function getPredictionFromAI(game) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: buildPrompt(game) }],
    temperature: 0.2,
    max_tokens: 220,
  });
  let raw = (response.choices?.[0]?.message?.content ?? "").trim();
  raw = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(raw);
    const conf = Number(parsed.confidence);
    if (!Number.isFinite(conf) || conf < 1 || conf > 100) parsed.confidence = 60;
    return parsed;
  } catch {
    return null;
  }
}

async function main() {
  const sportKey = process.argv[2];
  if (!sportKey) {
    console.error("Usage: node backend/updateGamesForSport.mjs <sport_key> [daysFrom]");
    process.exit(1);
  }
  const daysFrom = Number(process.argv[3]) || (sportKey === "americanfootball_nfl" ? 14 : 7);

  const odds = await fetchOdds(sportKey, daysFrom);

  const gamesData = loadJSON(gamesFile);
  const predictionsData = loadJSON(predictionsFile);
  gamesData[sportKey] = gamesData[sportKey] || [];

  const incoming = odds.map((g) => ({
    id: g.id,
    sport_key: g.sport_key,
    sport_title: g.sport_title,
    commence_time: g.commence_time,
    home_team: g.home_team,
    away_team: g.away_team,
    bookmakers: (g.bookmakers || []).filter((b) => b.key === "draftkings"),
  }));

  // Merge by id (keep existing, add new)
  const existingIds = new Set(gamesData[sportKey].map((x) => x.id));
  for (const g of incoming) {
    if (!existingIds.has(g.id)) gamesData[sportKey].push(g);
  }

  // Predict for new ones
  let added = 0;
  for (const g of incoming) {
    if (!g.bookmakers?.length) continue;
    if (predictionsData[g.id]) continue;
    const pred = await getPredictionFromAI(g);
    if (pred) {
      predictionsData[g.id] = pred;
      added++;
    }
  }

  // Sort by time
  gamesData[sportKey].sort((a, b) => new Date(a.commence_time) - new Date(b.commence_time));
  saveJSON(gamesFile, gamesData);
  saveJSON(predictionsFile, predictionsData);

  console.log(`✅ Updated ${sportKey}. New predictions: ${added}`);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
