import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

// Pull a mapping provider_game_id -> game_id
async function loadMap(){
  const out = {};
  let from = 0;
  while (true) {
    const r = await sb.from("games")
      .select("provider_game_id, game_id")
      .is("provider_game_id", null, false) // ignore nulls
      .range(from, from+999);
    if (r.error) throw r.error;
    for (const row of r.data || []) {
      if (row.provider_game_id && row.game_id) out[row.provider_game_id] = row.game_id;
    }
    if (!r.data || r.data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function main(){
  const map = await loadMap();

  // Find odds rows that don't join to any games row
  const bad = await sb.rpc('exec', {
    query: `
      select o.id, o.game_id as odds_gid, g_by_provider.game_id as fix_to
      from public.odds o
      left join public.games g on g.game_id = o.game_id
      left join public.games g_by_provider on g_by_provider.provider_game_id = o.game_id -- in case we accidentally stored provider id in odds
      where g.game_id is null
      limit 5000
    `
  });

  if (bad.error) { console.error(bad.error); process.exit(1); }
  const rows = bad.data || [];
  console.log("mismatched odds rows:", rows.length);

  let fixed = 0;
  for (const r of rows) {
    // If odds_gid looks like a provider id and we can map it, fix it
    const maybe = map[r.odds_gid] || r.fix_to || null;
    if (!maybe) continue;
    const up = await sb.from("odds").update({ game_id: maybe }).eq("id", r.id);
    if (!up.error) fixed++;
  }
  console.log("fixed:", fixed);
}
await main();
