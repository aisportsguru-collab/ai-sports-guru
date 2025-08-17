import { getCache, setCache } from "../utils/cache";
import { MOCK_GAMES } from "./mock";

export type LeagueGame = {
  id: string;
  league: string;
  kickoffUtc: string;        // ISO UTC
  kickoffLocal?: string;     // optional if your API gives it
  homeTeam: string;
  awayTeam: string;
  bestMarketLabel?: string;
  bestMarketLine?: string;
  bestOddsLabel?: string;
};

const RAW = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const BASE = RAW.replace(/\/$/, "");          // strip trailing /
const api = (p: string) => `${BASE}/api${p}`;

const TTL_MS = 15 * 60 * 1000; // 15 min cache

function key(parts: (string|number|undefined)[]) {
  return `leagues:${parts.filter(Boolean).join(":")}`;
}

async function fetchJSON<T>(url: string, timeoutMs = 10000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: ctrl.signal,
    });
    const ctype = res.headers.get("content-type") || "";
    const text = await res.text();
    // detect JSON by header or first char
    const looksJson = ctype.includes("application/json") || /^[\[{]/.test(text.trim());
    if (!res.ok || !looksJson) {
      throw new Error(`[API] Non-JSON or bad status ${res.status} for ${url}`);
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(t);
  }
}

/** Optional: list of leagues (not strictly required by app) */
export async function fetchLeagues(): Promise<{id:string,label?:string}[]> {
  const K = key(["list"]);
  const cached = await getCache<{id:string,label?:string}[]>(K, TTL_MS);
  if (cached) return cached;

  try {
    const data = await fetchJSON<{id:string,label?:string}[]>(api(`/leagues`));
    await setCache(K, data);
    return data;
  } catch (e) {
    console.warn(String(e));
    // Fallback: build from mock keys
    const data = Object.keys(MOCK_GAMES).map(id => ({ id, label: id.replace(/_/g, " ").toUpperCase() }));
    await setCache(K, data);
    return data;
  }
}

/** Games for a league on a UTC date (yyyy-mm-dd). */
export async function fetchLeagueGames(leagueId: string, date?: string): Promise<LeagueGame[]> {
  const d = date || new Date().toISOString().slice(0,10);
  const K = key(["games", leagueId, d]);

  const cached = await getCache<LeagueGame[]>(K, TTL_MS);
  if (cached) return cached;

  const url = api(`/leagues/${leagueId}/games?date=${encodeURIComponent(d)}`);
  try {
    const list = await fetchJSON<LeagueGame[]>(url);
    await setCache(K, list);
    return list;
  } catch (e) {
    console.warn(String(e));
    // Fallback to mock
    const demo = MOCK_GAMES[leagueId] ?? [];
    await setCache(K, demo);
    return demo;
  }
}
