export type Game = {
  id: string;
  league: "nfl";
  kickoffISO: string;
  home: string;
  away: string;
  odds: {
    moneyline?: { home?: number; away?: number; book?: string };
    spread?: {
      home?: { point: number; price: number };
      away?: { point: number; price: number };
      book?: string;
    };
    total?: {
      over?: { point: number; price: number };
      under?: { point: number; price: number };
      book?: string;
    };
  };
  predictions?: {
    moneyline?: { pick: "HOME" | "AWAY"; confidencePct: number };
    spread?: { pick: "HOME" | "AWAY"; line: number; confidencePct: number };
    total?: { pick: "OVER" | "UNDER"; line: number; confidencePct: number };
  };
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function listGames(
  league: "nfl",
  opts?: { from?: string; to?: string }
): Promise<Game[]> {
  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 45);

  const from = opts?.from ?? ymd(fromDate);
  const to = opts?.to ?? ymd(toDate);

  const url = `${API_BASE}/api/games?league=${league}&from=${from}&to=${to}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.warn("listGames bad status", res.status);
      return [];
    }
    const json = await res.json();
    const arr = json?.data;
    if (!Array.isArray(arr)) {
      console.warn("listGames data not array", arr);
      return [];
    }
    if (__DEV__) {
      console.log(`listGames: got ${arr.length} items. from=${from} to=${to}`);
      if (arr[0]) console.log("First item:", arr[0]);
    }
    return arr as Game[];
  } catch (err) {
    console.warn("listGames error", err);
    return [];
  }
}
