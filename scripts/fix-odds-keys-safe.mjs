import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

// Build a map: provider_game_id -> game_id (UUID)
async function buildProviderMap() {
  const map = new Map();
  let from = 0;
  for (;;) {
    const r = await sb.from("games")
      .select("provider_game_id, game_id")
      .not("provider_game_id", "is", null)
      .not("game_id", "is", null)
      .range(from, from + 999);
    if (r.error) throw r.error;
    for (const row of r.data || []) {
      map.set(row.provider_game_id, row.game_id);
    }
    if (!r.data || r.data.length < 1000) break;
    from += 1000;
  }
  return map;
}

// Return a Set of valid game UUIDs (so we can detect non-joining odds rows)
async function getValidGameUUIDs() {
  const set = new Set();
  let from = 0;
  for (;;) {
    const r = await sb.from("games").select("game_id").not("game_id", "is", null).range(from, from + 999);
    if (r.error) throw r.error;
    for (const row of r.data || []) set.add(row.game_id);
    if (!r.data || r.data.length < 1000) break;
    from += 1000;
  }
  return set;
}

async function main() {
  const providerToUUID = await buildProviderMap();
  const validUUIDs = await getValidGameUUIDs();

  // Pull odds rows in pages and find those that don't join
  let from = 0, scanned = 0, candidates = [];
  for (;;) {
    const r = await sb.from("odds")
      .select("id, game_id")
      .order("id", { ascending: true })
      .range(from, from + 1999);
    if (r.error) throw r.error;
    const rows = r.data || [];
    scanned += rows.length;

    for (const row of rows) {
      const gid = row.game_id;
      // If this odds.game_id is NOT a known UUID in games, try to map it as a provider id
      if (!validUUIDs.has(gid)) {
        // provider ids from TheOddsAPI are usually 32 hex chars, but we won't rely on length; just try map
        const mapped = providerToUUID.get(gid);
        if (mapped) {
          candidates.push({ id: row.id, to: mapped });
        }
      }
    }
    if (rows.length < 2000) break;
    from += 2000;
  }

  console.log("scanned_odds_rows:", scanned);
  console.log("will_fix_rows:", candidates.length);

  // Batch update
  let fixed = 0;
  for (const { id, to } of candidates) {
    const up = await sb.from("odds").update({ game_id: to }).eq("id", id);
    if (!up.error) fixed++;
  }
  console.log("fixed_rows:", fixed);
}

await main();
