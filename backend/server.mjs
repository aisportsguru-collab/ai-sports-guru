import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

// Route to get games for a given sport
app.get("/games/:sport", (req, res) => {
  const { sport } = req.params;

  const filePath = path.join(__dirname, "gamesData.json");
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ error: "gamesData.json not found" });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const games = data[sport] || [];
    res.json(games);
  } catch (error) {
    console.error("Error reading gamesData.json:", error);
    res.status(500).json({ error: "Failed to load games" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
