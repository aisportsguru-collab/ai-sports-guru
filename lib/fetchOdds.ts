import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_MARKETS,
  DEFAULT_ODDS_FORMAT,
  DEFAULT_REGIONS,
  ODDSAPI_SPORT_KEYS,
  SupportedSport,
} from "./sportsMap";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DB cache TTL (minutes)
const TTL_MIN = 10;

export async function fetchOddsForSport(
  sport: SupportedSport,
  daysFrom: number = 0
) {
  const sportKey = ODDSAPI_SPORT_KEYS[sport];

  // 1) try DB cache first
  const { data: cacheRow } = await supabase
    .from("odds_cache")
    .select("data, updated_at")
    .eq("sport", sport)
    .eq("days_from", daysFrom)
    .maybeSingle();

  if (cacheRow) {
    const ageMin =
      (Date.now() - new Date(cacheRow.updated_at as string).getTime()) / 60000;
    if (ageMin <= TTL_MIN) {
      return cacheRow.data as any[];
    }
  }

  // 2) call TheOddsAPI only if cache is stale/missing
  const apiKey =
    process.env.THE_ODDS_API_KEY || process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
  if (!apiKey) throw new Error("Missing THE_ODDS_API_KEY");

  const params = new URLSearchParams({
    regions: DEFAULT_REGIONS,
    markets: DEFAULT_MARKETS,
    oddsFormat: DEFAULT_ODDS_FORMAT,
    dateFormat: DEFAULT_DATE_FORMAT,
  });
  params.set("daysFrom", String(daysFrom));

  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?apiKey=${apiKey}&${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TheOddsAPI ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any[];

  // 3) upsert cache
  await supabase
    .from("odds_cache")
    .upsert(
      { sport, days_from: daysFrom, data, updated_at: new Date().toISOString() },
      { onConflict: "sport,days_from" }
    );

  // 4) optional: snapshot basic game rows for history/ML
  try {
    const rows = data.map((g: any) => ({
      sport,
      game_id: g.id,
      commence_time: g.commence_time,
      home_team: g.home_team,
      away_team: g.away_team,
      meta: { sport_title: g.sport_title ?? null },
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      await supabase.from("games").upsert(rows, { onConflict: "sport,game_id" });
    }
  } catch {
    // non-fatal
  }

  return data;
}
