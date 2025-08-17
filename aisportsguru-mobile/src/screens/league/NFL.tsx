import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";

/** Types matching your API */
type Game = {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
};
type Prediction = {
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffISO: string;
  market: "SPREAD" | "ML" | "TOTAL";
  pick: "HOME" | "AWAY" | "OVER" | "UNDER";
  line?: number;
  edgePct: number;
};

/** Helpers */
const API = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3000/api";
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const fmtKICK = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** Lightweight API calls */
async function listGames(league: string, dayISO: string): Promise<Game[]> {
  const url = `${API}/games?league=${encodeURIComponent(
    league
  )}&date=${encodeURIComponent(dayISO)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`games fetch failed: ${res.status}`);
  return res.json();
}
async function listPredictions(
  league: string,
  dayISO: string
): Promise<Prediction[]> {
  const url = `${API}/predictions?league=${encodeURIComponent(
    league
  )}&date=${encodeURIComponent(dayISO)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`predictions fetch failed: ${res.status}`);
  return res.json();
}

export default function NFLScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const day = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
        const [g, p] = await Promise.all([
          listGames("nfl", day),
          listPredictions("nfl", day),
        ]);
        setGames(g ?? []);
        setPreds(p ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load data");
      }
    })();
  }, []);

  /** Group predictions by game */
  const predsByKey = useMemo(() => {
    const m = new Map<string, Prediction[]>();
    for (const p of preds) {
      const key = `${p.homeTeam}|${p.awayTeam}|${p.kickoffISO}`;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return m;
  }, [preds]);

  /** 🔭 Bump horizon to 45 days */
  const VISIBLE_HORIZON_DAYS = 45;
  const visibleGames = useMemo(() => {
    const start = startOfToday();
    const end = addDays(start, VISIBLE_HORIZON_DAYS);
    return games
      .filter((g) => {
        const k = new Date(g.kickoffISO);
        return !Number.isNaN(k.getTime()) && k >= start && k <= end;
      })
      .sort(
        (a, b) =>
          new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime()
      );
  }, [games]);

  /** Optional team search */
  const filtered = useMemo(() => {
    if (!q.trim()) return visibleGames;
    const s = q.trim().toLowerCase();
    return visibleGames.filter(
      (g) =>
        g.homeTeam.toLowerCase().includes(s) ||
        g.awayTeam.toLowerCase().includes(s)
    );
  }, [q, visibleGames]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search teams..."
        value={q}
        onChangeText={setQ}
        style={styles.search}
      />
      {err ? <Text style={styles.error}>{err}</Text> : null}

      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No upcoming NFL games</Text>
          <Text style={styles.emptySub}>Try widening the date window.</Text>
        </View>
      ) : (
        <ScrollView>
          {filtered.map((g) => {
            const key = `${g.homeTeam}|${g.awayTeam}|${g.kickoffISO}`;
            const p = (predsByKey.get(key) ?? []).sort((a, b) =>
              a.market.localeCompare(b.market)
            );
            return (
              <View key={key} style={styles.card}>
                <Text style={styles.match}>
                  {g.awayTeam} @ {g.homeTeam}
                </Text>
                <Text style={styles.meta}>{fmtKICK(g.kickoffISO)}</Text>

                <View style={styles.row}>
                  {p.map((x) => {
                    const label =
                      x.market === "ML"
                        ? `ML: ${x.pick}`
                        : x.market === "TOTAL"
                        ? `Total ${x.pick}${x.line ? ` ${x.line}` : ""}`
                        : `Spread ${x.pick}${x.line ? ` ${x.line}` : ""}`;
                    return (
                      <View key={`${key}|${x.market}`} style={styles.chip}>
                        <Text>
                          {label} • Edge {x.edgePct}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/** Styles */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
  },
  match: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  meta: { color: "#6b7280", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" as const },
  chip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  emptyWrap: { alignItems: "center", marginTop: 32 },
  emptyTitle: { fontWeight: "700" },
  emptySub: { color: "#6b7280", marginTop: 4 },
  error: { color: "#ef4444" },
});
