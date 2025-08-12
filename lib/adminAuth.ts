import crypto from "node:crypto";

export function readAdminHeader(req: Request): string {
  const h1 = req.headers.get("x-admin-token");
  const h2 = req.headers.get("authorization");
  if (h1 && h1.trim()) return h1.trim();
  if (h2 && /^bearer\s+/i.test(h2.trim())) {
    return h2.trim().replace(/^bearer\s+/i, "");
  }
  return "";
}

export function verifyAdmin(req: Request): { ok: true } | { ok: false; reason: string } {
  const env = (process.env.ADMIN_TOKEN || "").trim();   // must be set in Vercel
  const incoming = readAdminHeader(req);

  if (!env) return { ok: false, reason: "ADMIN_TOKEN not set on server" };
  if (!incoming) return { ok: false, reason: "missing token header" };

  // Fast length check helps catch hidden whitespace
  if (env.length !== incoming.length) {
    return { ok: false, reason: `length mismatch env=${env.length} header=${incoming.length}` };
  }

  try {
    const a = Buffer.from(env);
    const b = Buffer.from(incoming);
    const match = crypto.timingSafeEqual(a, b);
    return match ? { ok: true } : { ok: false, reason: "token mismatch" };
  } catch {
    return { ok: false, reason: "token mismatch" };
  }
}
2) Replace route: app/api/admin/upsert-predictions/route.ts
ts
Copy
Edit
// app/api/admin/upsert-predictions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs"; // ensure server runtime

type SpreadPick = { team: string; line: number; edge: number };
type OuPick = { total: number; pick: "Over" | "Under"; edge: number };

type Entry = {
  sport: string;
  season: number;
  week: number | null;
  game_date: string; // ISO date
  home_team: string;
  away_team: string;
  predicted_winner: string;
  confidence: number;
  spread_pick?: SpreadPick | null;
  ou_pick?: OuPick | null;
  offense_favor?: string | null;
  defense_favor?: string | null;
  key_players_home?: string[] | null;
  key_players_away?: string[] | null;
  analysis?: any;
  source_tag?: string | null;
};

export async function POST(req: Request) {
  const auth = verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }

  let body: { entries: Entry[] } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase server credentials missing" }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const ids: string[] = [];
  const errors: Array<{ entry: Entry; message: string }> = [];

  for (const entry of body.entries) {
    const { data, error } = await supabase
      .from("ai_research_predictions")
      .upsert(entry, { onConflict: "sport,season,week,game_date,home_team,away_team" })
      .select("id")
      .single();

    if (error) {
      errors.push({ entry, message: error.message });
    } else if (data?.id) {
      ids.push(data.id);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    inserted_or_updated: ids.length,
    ids,
    errors,
  });
}
