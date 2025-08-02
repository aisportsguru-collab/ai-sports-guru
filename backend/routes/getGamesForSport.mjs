import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// GET /games/:sport
router.get("/games/:sport", (req, res) => {
  try {
    const sport = req.params.sport;
    const dataPath = path.join(process.cwd(), "gamesData.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const gamesData = JSON.parse(rawData);

    if (!gamesData[sport]) {
      return res.status(404).json({ error: "Sport not found" });
    }

    return res.json(gamesData[sport]);
  } catch (err) {
    console.error("Error reading gamesData.json:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


