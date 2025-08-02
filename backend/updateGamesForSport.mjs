// updateGamesForSport.mjs
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: "../.env.local" });

const apiKey = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const gamesFile = path.resolve("./gamesData.json");

// Load existing data
function loadGames() {
  if (!fs.existsSync(gamesFile)) return {};
  return JSON.parse(fs.readFileSync(gamesFile, "utf-8"));
}

// Save updated data
function saveGames(data) {
  fs.writeFileSync(gamesFile, JSON.stringify(data, null, 2));
  console.log(`All new games and predictions saved to ./gamesData.json`);
}

// Fetch odds from TheOddsAPI
async function fetchOdds(sportKey) {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?daysFrom=7&regions=us&markets=h2h,spreads&oddsFormat=american&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch odds: ${response.statusText}`);
  }
  return await response.json();
}

// Generate prediction using OpenAI
async function generatePrediction(homeTeam, awayTeam, bookmakers) {
  const prompt = `
You are an AI sports analyst. Based on these bookmakers odds, predict the game outcome.

Match: ${homeTeam} vs ${awayTeam}
Odds data: ${JSON.stringify(bookmakers, null, 2)}

Respond ONLY in strict JSON format with the following fields:
{
  "moneyline": "Team Name",
  "spread": "Team Name -X.X",
  "total": "Over", "Under", or a number (e.g., 48),
  "confidence": integer between 1 and 100
}
No extra commentary, no code blocks, no text outside the JSON.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
  });

  let raw = completion.choices[0].message.content.trim();
  console.log(`AI raw response: ${raw}`);

  // Clean code fences if they exist
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    const prediction = JSON.parse(raw);

    // Validate confidence
    if (
      !prediction.confidence ||
      typeof prediction.confidence !== "number" ||
      prediction.confidence <= 0 ||
      prediction.confidence > 100
    ) {
      prediction.confidence = 50;
    }

    return prediction;
  } catch (err) {
    console.error(
      `Prediction failed for ${homeTeam} vs ${awayTeam}: ${err}\nResponse: ${raw}`
    );
    return null;
  }
}

async function main() {
  const sportKey = process.argv[2];
  if (!sportKey) {
    console.error("Usage: node updateGamesForSport.mjs <sport_key>");
    process.exit(1);
  }

  console.log(`Fetching odds for ${sportKey}...`);
  const odds = await fetchOdds(sportKey);

  const data = loadGames();
  if (!data[sportKey]) data[sportKey] = [];

  for (const game of odds) {
    const exists = data[sportKey].some((g) => g.id === game.id);
    if (exists) continue;

    const bookmakers = game.bookmakers || [];
    let prediction = null;

    if (bookmakers.length > 0) {
      console.log(
        `Generating prediction for ${game.home_team} vs ${game.away_team}`
      );
      prediction = await generatePrediction(
        game.home_team,
        game.away_team,
        bookmakers
      );
    }

    data[sportKey].push({
      ...game,
      prediction: prediction || null,
      result: { winner: null, spreadResult: null, totalResult: null },
    });
  }

  // Sort by game date
  data[sportKey].sort(
    (a, b) => new Date(a.commence_time) - new Date(b.commence_time)
  );

  saveGames(data);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
