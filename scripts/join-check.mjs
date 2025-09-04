import { config } from "dotenv";
config({ path: ".env.local", override: true }); config();
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function counts(league){
  // odds rows that successfully join by game_id
  const ok = await sb.rpc('exec', {
    query: `
      select count(*)::int as c
      from public.odds o
      join public.games g on g.game_id = o.game_id
      where g.sport = '${league}'
    `
  }).catch(()=>null);

  // odds rows whose game_id is NOT present in games.game_id
  const bad = await sb.rpc('exec', {
    query: `
      select count(*)::int as c
      from public.odds o
      left join public.games g on g.game_id = o.game_id
      where g.game_id is null
    `
  }).catch(()=>null);

  console.log({ league, join_ok: ok?.data?.[0]?.c ?? null, join_bad: bad?.data?.[0]?.c ?? null });
}

async function sample(league){
  const res = await sb.rpc('exec', {
    query: `
      select o.game_id as odds_gid, g.game_id as games_gid, g.sport, g.home_team, g.away_team,
             o.moneyline_home, o.moneyline_away, o.spread_line, o.total_points, o.sportsbook, o.updated_at
      from public.odds o
      left join public.games g on g.game_id = o.game_id
      where g.sport = '${league}'
      order by o.updated_at desc
      limit 5
    `
  }).catch(()=>null);
  console.log("sample", league, res?.data ?? res?.error);
}

await counts('mlb');
await counts('ncaaf');
await sample('mlb');
await sample('ncaaf');
