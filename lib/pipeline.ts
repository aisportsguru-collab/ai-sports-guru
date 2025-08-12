import { createClient } from "@supabase/supabase-js";

type Sport = "mlb" | "nfl" | "nba" | "nhl" | "ncaaf" | "ncaab" | "wnba";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ODDS_API_KEY = process.env.ODDS_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function runPipelineOnce(sport: Sport, dateISO: string) {
  const odds = await fetchOdds(sport, dateISO);

  const rows: any[] = [];
  for (const g of odds) {
    if (!g.id || !g.commence_time) continue;

    const commenceISO = new Date(g.commence_time).toISOString();
    const snap = buildSnapshot(g);
    const season = computeSeason(sport, new Date(commenceISO));
    const model = await callModel({
      sport,
      home_team: g.home_team,
      away_team: g.away_team,
      commence_time: commenceISO,
      snapshot: snap,
    });

    rows.push({
      sport,
      game_date: dateISO,
      season,
      external_id: g.id,
      home_team: g.home_team,
      away_team: g.away_team,
      commence_time: commenceISO,

      pick_moneyline: model.pick_moneyline,
      pick_spread: model.pick_spread,
      pick_total: model.pick_total,
      conf_moneyline: model.conf_moneyline,
      conf_spread: model.conf_spread,
      conf_total: model.conf_total,
      rationale: model.rationale ?? null,

      predicted_winner:
        model.pick_moneyline === "HOME" ? g.home_team :
        model.pick_moneyline === "AWAY" ? g.away_team : null,

      moneyline_home: snap.moneyline_home,
      moneyline_away: snap.moneyline_away,
      spread_line: snap.spread_line,
      spread_price_home: snap.spread_price_home,
      spread_price_away: snap.spread_price_away,
      total_line: snap.total_line,
      total_over_price: snap.total_over_price,
      total_under_price: snap.total_under_price,
    });
  }

  if (!rows.length) return { upserted: 0, note: "No valid games" };

  const { data, error } = await supabase
    .from("ai_research_predictions")
    .upsert(rows, { onConflict: "external_id" })
    .select("external_id");

  if (error) throw error;
  return { upserted: data?.length || 0 };
}

function computeSeason(sport: Sport, d: Date) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  if (sport === "mlb") return y;
  if (["nfl", "ncaaf", "nba", "nhl", "ncaab", "wnba"].includes(sport)) {
    return m >= 8 ? y : y - 1;
  }
  return y;
}

function americanFromPrice(price: number | null | undefined) {
  if (price === null || price === undefined) return null;
  return Math.round(price);
}

function buildSnapshot(game: any) {
  const all = (game.bookmakers || []).flatMap((b: any) => b.markets || []);
  const mkt = (k: string) => all.find((m: any) => m.key === k);

  const h2h = mkt("h2h");
  let moneyline_home: number | null = null;
  let moneyline_away: number | null = null;
  if (h2h?.outcomes) {
    for (const o of h2h.outcomes) {
      if (o.name === game.home_team) moneyline_home = americanFromPrice(o.price);
      if (o.name === game.away_team) moneyline_away = americanFromPrice(o.price);
    }
  }

  const spreads = mkt("spreads");
  let spread_line: number | null = null;
  let spread_price_home: number | null = null;
  let spread_price_away: number | null = null;
  if (spreads?.outcomes) {
    for (const o of spreads.outcomes) {
      if (o.name === game.home_team) {
        spread_line = Number(o.point);
        spread_price_home = americanFromPrice(o.price);
      }
      if (o.name === game.away_team) {
        spread_price_away = americanFromPrice(o.price);
      }
    }
  }

  const totals = mkt("totals");
  let total_line: number | null = null;
  let total_over_price: number | null = null;
  let total_under_price: number | null = null;
  if (totals?.outcomes) {
    for (const o of totals.outcomes) {
      const nm = (o.name || "").toUpperCase();
      if (nm === "OVER") {
        total_line = Number(o.point);
        total_over_price = americanFromPrice(o.price);
      }
      if (nm === "UNDER") {
        total_under_price = americanFromPrice(o.price);
      }
    }
  }

  return {
    moneyline_home,
    moneyline_away,
    spread_line,
    spread_price_home,
    spread_price_away,
    total_line,
    total_over_price,
    total_under_price,
  };
}

async function fetchOdds(sport: Sport, dateISO: string) {
  const map: Record<Sport, string> = {
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    nba: "basketball_nba",
    nhl: "icehockey_nhl",
    ncaaf: "americanfootball_ncaaf",
    ncaab: "basketball_ncaab",
    wnba: "basketball_wnba",
  };

  const url = new URL("https://api.the-odds-api.com/v4/sports/" + map[sport] + "/odds");
  url.searchParams.set("regions", "us");
  url.searchParams.set("markets", "h2h,spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("apiKey", ODDS_API_KEY);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Odds API status ${res.status} ${text}`);
  }
  const json = await res.json();

  return json
    .filter((g: any) => (g.commence_time || "").slice(0, 10) === dateISO)
    .map((g: any) => ({
      id: g.id,
      home_team: g.home_team,
      away_team: g.away_team,
      commence_time: g.commence_time,
      bookmakers: g.bookmakers || [],
    }));
}

async function callModel(input: {
  sport: Sport;
  home_team: string;
  away_team: string;
  commence_time: string;
  snapshot: ReturnType<typeof buildSnapshot>;
}) {
  const rationale = `Baseline evaluation using current odds snapshot. ${input.away_team} at ${input.home_team}.`;

  return {
    pick_moneyline:
      input.snapshot.moneyline_home != null &&
      input.snapshot.moneyline_away != null
        ? Math.abs(input.snapshot.moneyline_home) < Math.abs(input.snapshot.moneyline_away)
          ? "HOME"
          : "AWAY"
        : "HOME",
    pick_spread:
      input.snapshot.spread_line != null
        ? `HOME ${input.snapshot.spread_line >= 0 ? "+" : ""}${input.snapshot.spread_line}`
        : "HOME -1.5",
    pick_total:
      input.snapshot.total_line != null
        ? `UNDER ${input.snapshot.total_line}`
        : "UNDER 8.5",
    conf_moneyline: 58,
    conf_spread: 55,
    conf_total: 54,
    rationale,
  };
}
