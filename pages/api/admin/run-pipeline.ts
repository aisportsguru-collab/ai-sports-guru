import type { NextApiRequest, NextApiResponse } from "next";
import { runPipelineOnce } from "../../../lib/pipeline";

const ADMIN_TOKEN = process.env.PREDICTIONS_ADMIN_TOKEN || process.env.ADMIN_TOKEN || "";

type Sport = "mlb" | "nfl" | "nba" | "nhl" | "ncaaf" | "ncaab" | "wnba";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const token = req.headers["x-admin-token"];
    if (!token || token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sport = String(req.query.sport || "mlb").toLowerCase() as Sport;
    const dateISO = String(req.query.date || new Date().toISOString().slice(0, 10));

    const r = await runPipelineOnce(sport, dateISO);
    return res.status(200).json({ ok: true, sport, date: dateISO, upserted: r.upserted, note: r.note ?? null });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
