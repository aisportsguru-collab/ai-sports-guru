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
    const start = String(req.query.start || ""); // YYYY-MM-DD
    const end = String(req.query.end || "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return res.status(400).json({ error: "Provide start and end as YYYY-MM-DD" });
    }

    const s = new Date(start + "T00:00:00Z");
    const e = new Date(end + "T00:00:00Z");
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    const days: string[] = [];
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }

    let total = 0;
    const perDay: Record<string, number> = {};
    for (const d of days) {
      const r = await runPipelineOnce(sport, d);
      perDay[d] = r.upserted;
      total += r.upserted;
    }

    return res.status(200).json({ ok: true, sport, start, end, total, perDay });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
