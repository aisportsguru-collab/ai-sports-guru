const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ||
  process.env.API_BASE ||
  "http://localhost:3000";

async function getJSON(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const j = await r.json();
  return Array.isArray(j) ? j : j?.data ?? [];
}

async function firstNonEmpty(urls: string[]): Promise<any[]> {
  let lastEmpty: any[] = [];
  for (const u of urls) {
    try {
      const data = await getJSON(u);
      if (Array.isArray(data) && data.length) return data;
      lastEmpty = data;
    } catch {
      // ignore and try next shape
    }
  }
  return lastEmpty; // may be empty, but best effort
}

export async function listGames(
  league: string,
  from?: string,
  to?: string
): Promise<any[]> {
  const base = (qs: URLSearchParams) =>
    `${API_BASE}/api/games?${qs.toString()}`;

  const today = new Date().toISOString().slice(0, 10);
  const _from = from ?? today;
  const _to = to ?? _from;

  const urls: string[] = [];

  // 1) bare league (many backends return all upcoming)
  {
    const qs = new URLSearchParams({ league });
    urls.push(base(qs));
  }
  // 2) single-day styles
  {
    const qDay = new URLSearchParams({ league, day: _from });
    const qDate = new URLSearchParams({ league, date: _from });
    urls.push(base(qDay), base(qDate));
  }
  // 3) range styles
  {
    const qFromTo = new URLSearchParams({ league, from: _from, to: _to });
    const qStartEnd = new URLSearchParams({
      league,
      startDate: _from,
      endDate: _to,
    });
    urls.push(base(qFromTo), base(qStartEnd));
  }

  return firstNonEmpty(urls);
}

export async function listPredictions(league: string): Promise<any[]> {
  const qs = new URLSearchParams({ league });
  return getJSON(`${API_BASE}/api/predictions?${qs.toString()}`);
}

export default { listGames, listPredictions };
