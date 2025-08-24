type League =
  | "mlb" | "nfl" | "nba" | "nhl" | "ncaaf" | "ncaab" | "wnba";

function getBaseUrl() {
  // Prefer explicit public site URL in prod
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  // On Vercel server runtime, VERCEL_URL is like "aisportsguru.com"
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`.replace(/\/+$/, "");

  // Fallback to local dev
  return "http://localhost:3000";
}

export async function fetchLeaguePredictions(
  league: League,
  opts?: { season?: string | number; game_date?: string }
): Promise<{ count: number; rows: any[] }> {
  const base = getBaseUrl();
  const url = new URL(`/api/predictions/${league}`, base);
  if (opts?.season != null) url.searchParams.set("season", String(opts.season));
  if (opts?.game_date) url.searchParams.set("game_date", opts.game_date);

  const res = await fetch(url.toString(), {
    // Data changes daily; avoid caching
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`fetchLeaguePredictions ${league}: ${res.status} ${txt}`);
  }

  const json = await res.json();
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const count: number = typeof json?.count === "number" ? json.count : rows.length;

  return { count, rows };
}
