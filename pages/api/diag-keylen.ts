import type { NextApiRequest, NextApiResponse } from "next";

function mask(v?: string | null) {
  if (!v) return { present: false, len: 0, head: "", tail: "" };
  const len = v.length;
  const head = v.slice(0, 6);
  const tail = v.slice(-6);
  return { present: true, len, head, tail };
}

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  res.status(200).json({
    NEXT_PUBLIC_SUPABASE_URL: mask(url),
    SUPABASE_SERVICE_ROLE_KEY: mask(srk),
  });
}
