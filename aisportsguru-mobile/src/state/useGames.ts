import { useEffect, useMemo, useState, useCallback } from "react";

type AnyRec = Record<string, any>;
type UseGamesResult = {
  games: AnyRec[];
  loading: boolean;
  source?: string;
  error?: string;
  refresh: () => void;
};

const dateISO = (d: Date) => d.toISOString().slice(0, 10);

function apiBase() {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    "https://ai-sports-guru-ek55nturj-jordan-smiths-projects-aba7b6c0.vercel.app"
  );
}

function extractGames(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  const keys = ["games", "items", "rows", "data", "results", "result"];
  for (const k of keys) {
    const v = (payload || {})[k];
    if (Array.isArray(v)) return v;
  }
  for (const v of Object.values(payload || {})) {
    if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
  }
  return [];
}

export function useGames(league: string, daysAhead = 45): UseGamesResult {
  const [games, setGames] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const { from, to } = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);
    return { from: dateISO(start), to: dateISO(end) };
  }, [daysAhead]);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const url = `${apiBase()}/api/games-with-predictions?league=${encodeURIComponent(
      league
    )}&from=${from}&to=${to}`;
    try {
      console.log("[listGames] GET %s", url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const meta = (data && data.meta) || {};
      const list = extractGames(data);
      console.log(
        "[listGames] ok league=%s count=%d source=%s",
        meta.league || league,
        meta.count ?? list.length,
        meta.source ?? "fresh"
      );
      setGames(list);
      setSource(meta.source ?? "fresh");
    } catch (e: any) {
      console.warn("[listGames] error league=%s -> %s", league, e?.message || e);
      setError(e?.message || "fetch error");
      setGames([]);
      setSource("error");
    } finally {
      setLoading(false);
    }
  }, [league, from, to]);

  useEffect(() => { fetchGames(); }, [fetchGames, refreshKey]);
  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  return { games, loading, source, error, refresh };
}
