import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const cwd = process.cwd();
  const pipelinePath = path.join(cwd, "pages", "api", "admin", "run-pipeline.ts");
  let exists = false;
  try { exists = fs.existsSync(pipelinePath); } catch {}
  res.status(200).json({
    ok: true,
    router: "pages",
    cwd,
    pipelineFileExists: exists,
    pipelinePath,
  });
}
