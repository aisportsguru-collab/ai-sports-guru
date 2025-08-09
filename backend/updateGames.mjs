import fs from "fs";
import fetch from "node-fetch";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY not set.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

const sports = [
  "americanfootball_nfl",
  "basketball_nba",
  "icehockey_nhl",
  "baseball_mlb",
  "americanfootball_ncaaf",
  "basketball_ncaab",
  "basketball_wnba"
];

const regions = "us";
const markets = "h2h,spreads,totals";
const oddsApiKey = "b6e7791d3ec6addb04468d9e5641f8e2";
const gamesFile = "gamesData.json";
const predictionsFile = "predictionsData.json";

async function fetchOddsForSport(sport) {
  console.log(`Fetching odds for ${sport}...`);
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?daysFrom=1&apiKey=${oddsApiKey}&regions=${regions}&markets=${markets}&oddsFormat=american`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch odds for ${sport}`);
  }
  return await response.json();
}

function loadJSON(file) {
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return {};
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function getPredictionFromAI(sport, game) {
  const prompt = `
You are an expert sports betting AI. Analyze the following matchup and betting odds:

Sport: ${game.sport_title}
Teams: ${game.away_team} vs ${game.home_team}
Markets: ${JSON.stringify(game.bookmakers[0].markets, null, 2)}

Provide your prediction for:
1. Moneyline winner
2. Spread winner (team and +/- points)
3. Total over/under (which side to take)

4. Confidence as a whole number percentage (0 to 100, no decimals)

Return JSON in the format:
{
  "moneyline": "Team",
  "spread": "Team +/-points",
  "total": "Over/Under X",
  "confidence": 85
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.3
  });

  let text = response.choices[0].message.content.trim();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse AI response, raw text:", text);
    return null;
  }
}

async function updateGames() {
  const gamesData = {};
  const predictionsData = loadJSON(predictionsFile);

  for (const sport of sports) {
    const odds = await fetchOddsForSport(sport);

    // Filter DraftKings only
    gamesData[sport] = odds.map((game) => {
      return {
        id: game.id,
        sport_key: game.sport_key,
        sport_title: game.sport_title,
        commence_time: game.commence_time,
        home_team: game.home_team,
        away_team: game.away_team,
        bookmakers: game.bookmakers.filter((b) => b.key === "draftkings")
      };
    });
  }

  saveJSON(gamesFile, gamesData);
  console.log(`Saved ${gamesFile} with ${sports.length} sports.`);

  // Generate AI predictions
  for (const sport of Object.keys(gamesData)) {
    for (const game of gamesData[sport]) {
      const gameKey = `${sport}_${game.away_team}_vs_${game.home_team}`;

      // Check for existing prediction to prevent duplicates
      if (predictionsData[gameKey]) {
        continue;
      }

      console.log(
        `Generating prediction for ${game.sport_title}: ${game.away_team} vs ${game.home_team}`
      );
      const prediction = await getPredictionFromAI(sport, game);
      if (prediction) {
        predictionsData[gameKey] = {
          ...game,
          ai_prediction: prediction
        };
      }
    }
  }

  saveJSON(predictionsFile, predictionsData);
  console.log(`Saved ${predictionsFile} with AI predictions.`);
}

updateGames().catch((err) => {
  console.error("Error updating games:", err);
});
