import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList } from "react-native";
import { listGames, listPredictions } from "@/lib/api";

/** Types are intentionally loose so we don't crash on shape changes */
type Game = {
  id?: string | number;
  league?: string;
  kickoffISO?: string;
  startTime?: string;
  kickoff?: string | number;
  commence_time?: string | number;
  commenceTime?: string | number;
  scheduled?: string | number;
  date?: string | number;
  startsAt?: string | number;
  start?: string | number;
  homeTeam?: string;
  awayTeam?: string;
  teams?: { home?: string; away?: string };
  odds?: any;
  lines?: any;
};

type Prediction = {
  gameId?: string | number;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  pickType?: "moneyline" | "spread" | "total";
  pickSide?: "HOME" | "AWAY" | "OVER" | "UNDER";
  spread?: number | null;
  total?: number | null;
  edge?: number | null; // model edge in %
};

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

/** Robust date parsing (strings, ms epoch, or seconds epoch) */
function asDate(v: any): Date | null {
  if (!v && v !== 0) return null;
  if (typeof v === "number") {
    const ms = v < 10_000_000_000 ? v * 1000 : v; // seconds -> ms
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return null;
}

/** Find a kickoff on common fields */
function getKickoff(g: Game): Date | null {
  return (
    asDate(g.kickoffISO) ||
    asDate(g.startTime) ||
    asDate(g.kickoff) ||
    asDate(g.commence_time) ||
    asDate(g.commenceTime) ||
    asDate(g.scheduled) ||
    asDate(g.startsAt) ||
    asDate(g.start) ||
    asDate(g.date)
  );
}

/** Map model edge -> confidence 51–100% */
function edgeToConfidence(edge?: number | null): number | null {
  if (edge == null || Number.isNaN(edge)) return null;
  const v = Math.max(51, Math.min(100, 50 + edge));
  return Math.round(v);
}

/** Best-effort odds normalizer across common shapes */
function normalizeOdds(raw: any) {
  if (!raw) return {};
  const o = raw.odds ?? raw.lines ?? raw;

  const mlHome =
    o?.moneyline?.home ?? o?.ml?.home ?? o?.moneyline_home ?? o?.home_ml;
  const mlAway =
    o?.moneyline?.away ?? o?.ml?.away ?? o?.moneyline_away ?? o?.away_ml;

  const spreadHomePoints =
    o?.spread?.home?.points ?? o?.spread_home ?? o?.home_spread;
  const spreadAwayPoints =
    o?.spread?.away?.points ?? o?.spread_away ?? o?.away_spread;

  const spreadHomePrice =
    o?.spread?.home?.price ?? o?.home_spread_price ?? o?.spread_price_home;
  const spreadAwayPrice =
    o?.spread?.away?.price ?? o?.away_spread_price ?? o?.spread_price_away;

  const totalPoints = o?.total?.points ?? o?.total_points ?? o?.o_u?.points;
  const totalOverPrice = o?.total?.over?.price ?? o?.over_price ?? o?.o_price;
  const totalUnderPrice =
    o?.total?.under?.price ?? o?.under_price ?? o?.u_price;

  return {
    mlHome,
    mlAway,
    spreadHomePoints,
    spreadAwayPoints,
    spreadHomePrice,
    spreadAwayPrice,
    totalPoints,
    totalOverPrice,
    totalUnderPrice,
  };
}

const VISIBLE_HORIZON_DAYS = 45; // bump to 60/90 if you want

export default function NFLScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // IMPORTANT: revert to the day-based call your backend expects.
  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const day = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
        const data = await listGames("nfl", day);
        setGames(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setErr(e?.message || String(e));
        setGames([]);
      }
      try {
        const p = await listPredictions("nfl");
        setPreds(Array.isArray(p) ? p : []);
      } catch {
        /* predictions optional */
      }
    })();
  }, []);

  const visibleGames = useMemo(() => {
    const start = startOfToday().getTime();
    const end = addDays(new Date(start), VISIBLE_HORIZON_DAYS).getTime();
    return games
      .filter((g) => {
        const k = getKickoff(g)?.getTime();
        return typeof k === "number" && k >= start && k <= end;
      })
      .sort((a, b) => {
        const ka = getKickoff(a)?.getTime() ?? 0;
        const kb = getKickoff(b)?.getTime() ?? 0;
        return ka - kb;
      });
  }, [games]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return visibleGames;
    return visibleGames.filter((g) => {
      const home = g.homeTeam || g.teams?.home || "";
      const away = g.awayTeam || g.teams?.away || "";
      return `${home} ${away}`.toLowerCase().includes(term);
    });
  }, [visibleGames, q]);

  const predIndex = useMemo(() => {
    const m = new Map<string, Prediction[]>();
    for (const p of preds) {
      const key = String(p.gameId ?? "");
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return m;
  }, [preds]);

  const renderItem = ({ item }: { item: Game }) => {
    const kickoff = getKickoff(item) ?? new Date();
    const home = item.homeTeam || item.teams?.home || "Home";
    const away = item.awayTeam || item.teams?.away || "Away";
    const p = predIndex.get(String(item.id ?? "")) ?? [];

    const {
      mlHome,
      mlAway,
      spreadHomePoints,
      spreadAwayPoints,
      spreadHomePrice,
      spreadAwayPrice,
      totalPoints,
      totalOverPrice,
      totalUnderPrice,
    } = normalizeOdds(item);

    return (
      <View style={styles.card}>
        <Text style={styles.match}>
          {away} @ {home}
        </Text>
        <Text style={styles.meta}>
          {kickoff.toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>

        <Text style={styles.sectionLabel}>Odds</Text>

        <View style={styles.row}>
          <Text style={styles.cellHead}>Moneyline</Text>
          <Text style={styles.cellTeam}>{away}: {mlAway ?? "—"}</Text>
          <Text style={styles.cellTeam}>{home}: {mlHome ?? "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.cellHead}>Spread</Text>
          <Text style={styles.cellTeam}>
            {away}: {spreadAwayPoints ?? "—"} {spreadAwayPrice ? `(${spreadAwayPrice})` : ""}
          </Text>
          <Text style={styles.cellTeam}>
            {home}: {spreadHomePoints ?? "—"} {spreadHomePrice ? `(${spreadHomePrice})` : ""}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.cellHead}>Total</Text>
          <Text style={styles.cellTeam}>
            Over — {totalPoints ?? "—"} {totalOverPrice ? `(${totalOverPrice})` : ""}
          </Text>
          <Text style={styles.cellTeam}>
            Under — {totalPoints ?? "—"} {totalUnderPrice ? `(${totalUnderPrice})` : ""}
          </Text>
        </View>

        {p.length > 0 && <Text style={styles.sectionLabel}>Model picks</Text>}
        {p.length > 0 && (
          <View style={styles.pillRow}>
            {p.map((x, i) => {
              const conf = edgeToConfidence(x.edge ?? null);
              const label =
                x.pickType === "moneyline"
                  ? `ML: ${x.pickSide ?? "—"} • ${conf ? conf + "%" : "—"}`
                  : x.pickType === "spread"
                  ? `Spread: ${x.pickSide ?? "—"} ${x.spread ?? "—"} • ${conf ? conf + "%" : "—"}`
                  : x.pickType === "total"
                  ? `Total: ${x.pickSide ?? "—"} ${x.total ?? "—"} • ${conf ? conf + "%" : "—"}`
                  : `Pick • ${conf ? conf + "%" : "—"}`;
              return (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillText}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search teams…"
        style={styles.search}
      />

      {err ? <Text style={styles.error}>{err}</Text> : null}

      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No upcoming NFL games</Text>
          <Text style={styles.emptySub}>Try widening the date window.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(g, i) =>
            String(g.id ?? `${g.awayTeam ?? ""}-${g.homeTeam ?? ""}-${i}`)
          }
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
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
    backgroundColor: "white",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
  },
  match: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  meta: { color: "#6b7280", marginBottom: 8 },
  sectionLabel: {
    marginTop: 6,
    marginBottom: 6,
    fontWeight: "700",
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: "white",
  },
  cellHead: { flex: 1.2, color: "#6b7280", fontWeight: "600" },
  cellTeam: { flex: 1, textAlign: "center", fontWeight: "600" },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    marginTop: 6,
  },
  pillText: { fontWeight: "600" },

  emptyWrap: { alignItems: "center", marginTop: 32 },
  emptyTitle: { fontWeight: "700" },
  emptySub: { color: "#6b7280", marginTop: 4 },
  error: { color: "#ef4444" },
});
