import fs from "fs";
import fetch from "node-fetch";
import OpenAI from "openai";
import env from "./env.mjs"; // loads .env and exports requireEnv()

// Validate required keys up front
env.requireEnv([
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_THE_ODDS_API_KEY", // The Odds API
]);

const ODDS_API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sports = [
  "americanfootball_nfl",
  "basketball_nba",
  "icehockey_nhl",
  "baseball_mlb",
  "americanfootball_ncaaf",
  "basketball_ncaab",
  "basketball_wnba",
];

// Range: allow NFL up to 14 days, others 7 (can be tuned)
function daysForSport(s) {
  if (s === "americanfootball_nfl") return 14;
  return 7;
}

const regions = "us";
const markets = "h2h,spreads,totals";
const gamesFile = "backend/gamesData.json";
const predictionsFile = "backend/predictionsData.json";

async function fetchOddsForSport(sport) {
  const daysFrom = daysForSport(sport);
  console.log(`Fetching odds for ${sport} (daysFrom=${daysFrom})...`);
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?daysFrom=${daysFrom}&apiKey=${ODDS_API_KEY}&regions=${regions}&markets=${markets}&oddsFormat=american`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch odds for ${sport}`);
  return await r.json();
}

function loadJSON(file) {
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  return {};
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Stronger, sport-agnostic prompt that fixes spread/sign ambiguity.
function buildPrompt(game) {
  const sample = JSON.stringify(game.bookmakers?.[0]?.markets ?? [], null, 2);
  return `
You are an expert US sports betting model. Use the odds snapshot to recommend:
1) Moneyline winner (team name exactly as given)
2) Spread pick as "Team +/-X.X" — IMPORTANT:
   - If the market shows Home -5.5 / Away +5.5, "pick the side" to bet, not the market label.
   - Your answer must reflect the *betting side* and *points* (e.g. "Boise State Broncos -5.5" or "South Florida Bulls +5.5").
3) Total as "Over/Under X.X" using the listed total points.
4) Confidence integer 1–100.

ALWAYS return strict JSON (no backticks, no commentary):

{
  "moneyline": "Team",
  "spread": "Team +/-X.X",
  "total": "Over/Under X.X",
  "confidence": 75
}

Sport: ${game.sport_title}
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
  } catch (e) {
    console.warn("AI parse error; raw:", raw);
    return null;
  }
}

async function updateGames() {
  const gamesData = {};
  const predictionsData = loadJSON(predictionsFile);

  for (const sport of sports) {
    const odds = await fetchOddsForSport(sport);

    // Keep only DraftKings (consistent formatting)
    gamesData[sport] = odds.map((game) => ({
      id: game.id,
      sport_key: game.sport_key,
      sport_title: game.sport_title,
      commence_time: game.commence_time,
      home_team: game.home_team,
      away_team: game.away_team,
      bookmakers: (game.bookmakers || []).filter((b) => b.key === "draftkings"),
    }));
  }

  saveJSON(gamesFile, gamesData);
  console.log(`✅ wrote ${gamesFile}`);

  // Generate predictions where missing
  let newCount = 0;
  for (const sport of Object.keys(gamesData)) {
    for (const game of gamesData[sport]) {
      if (!game.bookmakers?.length) continue; // no lines, skip

      const key = game.id; // stable id
      if (predictionsData[key]) continue; // already have it

      const pred = await getPredictionFromAI(game);
      if (pred) {
        predictionsData[key] = pred;
        newCount++;
      }
    }
  }

  saveJSON(predictionsFile, predictionsData);
  console.log(`✅ wrote ${predictionsFile} (${newCount} new predictions)`);
}

updateGames().catch((err) => {
  console.error("❌ Error updating games:", err);
  process.exit(1);
});
