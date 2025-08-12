import type { NextApiRequest, NextApiResponse } from "next";
import { runPipelineOnce } from "../../../lib/pipeline";

const CRON_SECRET = process.env.CRON_SECRET || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const key = String(req.query.key || "");
    if (!CRON_SECRET || key !== CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sportList = (process.env.CRON_SPORTS || "mlb").split(",").map(s => s.trim().toLowerCase());
    const today = new Date().toISOString().slice(0, 10);

    const results: Record<string, number> = {};
    for (const sport of sportList) {
      const r = await runPipelineOnce(sport as any, today);
      results[sport] = r.upserted;
    }

    return res.status(200).json({ ok: true, date: today, results });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
