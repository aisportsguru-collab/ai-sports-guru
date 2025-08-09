const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Serve stored games for a specific league
app.get("/games/:league", (req, res) => {
  const { league } = req.params;
  const filePath = path.join(__dirname, "data", `${league}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf8");
      const json = JSON.parse(fileData);
      res.json(json);
    } else {
      res.status(404).json({ error: "No data found for this league" });
    }
  } catch (err) {
    console.error("Error reading data file:", err);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// Prediction endpoint (existing)
app.post("/predict", (req, res) => {
  const { league, games } = req.body;

  const predictions = games.map((game) => ({
    id: game.id,
    moneyline: {
      pick: Math.random() > 0.5 ? "home" : "away",
      confidence: Math.random()
    },
    spread: {
      pick: Math.random() > 0.5 ? "home" : "away",
      confidence: Math.random()
    },
    total: {
      pick: Math.random() > 0.5 ? "over" : "under",
      confidence: Math.random()
    }
  }));

  res.json(predictions);
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
