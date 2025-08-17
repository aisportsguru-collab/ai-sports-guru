import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { listGames, Game } from "@/lib/api";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtOdds(v?: number): string {
  if (v == null) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}
function fmtPoint(v?: number): string {
  return v == null ? "—" : `${v}`;
}
function fmtKickoff(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function NFLScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fromDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const toDate = useMemo(() => {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + 45);
    return d;
  }, [fromDate]);

  const from = ymd(fromDate);
  const to = ymd(toDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await listGames("nfl", { from, to });
    setGames(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading NFL games…</Text>
        <DebugBanner count={games.length} from={from} to={to} />
      </View>
    );
  }

  if (!games || games.length === 0) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <DebugBanner count={0} from={from} to={to} />
        <Text style={{ fontSize: 18, fontWeight: "700" }}>No upcoming NFL games</Text>
        <Text style={{ color: "#666" }}>
          If you see this often, check the server route window and the kickoffISO mapping.
        </Text>
        <Text onPress={onRefresh} style={{ color: "#0a7", fontWeight: "600" }}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={games}
      keyExtractor={(g) => g.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      renderItem={({ item }) => <GameCard g={item} />}
      ListHeaderComponent={<DebugBanner count={games.length} from={from} to={to} />}
    />
  );
}

function DebugBanner({ count, from, to }: { count: number; from: string; to: string }) {
  if (!__DEV__) return null;
  return (
    <View
      style={{
        padding: 8,
        backgroundColor: "#eef6ff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#cde",
        marginBottom: 8,
      }}
    >
      <Text style={{ fontWeight: "600" }}>Debug</Text>
      <Text>Window: {from} to {to}</Text>
      <Text>Games: {count}</Text>
    </View>
  );
}

function GameCard({ g }: { g: Game }) {
  const ml = g.odds.moneyline;
  const sp = g.odds.spread;
  const tot = g.odds.total;

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700" }}>
        {g.away} at {g.home}
      </Text>
      <Text style={{ color: "#666" }}>{fmtKickoff(g.kickoffISO)}</Text>

      <View
        style={{
          borderTopWidth: 1,
          borderColor: "#eee",
          paddingTop: 8,
          gap: 6,
        }}
      >
        <Row label="Moneyline" right={ml?.book}>
          <Cell label={g.away} value={fmtOdds(ml?.away)} />
          <Cell label={g.home} value={fmtOdds(ml?.home)} />
        </Row>

        <Row label="Spread" right={sp?.book}>
          <Cell label={g.away} value={`${fmtPoint(sp?.away?.point)}  ${fmtOdds(sp?.away?.price)}`} />
          <Cell label={g.home} value={`${fmtPoint(sp?.home?.point)}  ${fmtOdds(sp?.home?.price)}`} />
        </Row>

        <Row label="Total" right={tot?.book}>
          <Cell label="Over" value={`${fmtPoint(tot?.over?.point)}  ${fmtOdds(tot?.over?.price)}`} />
          <Cell label="Under" value={`${fmtPoint(tot?.under?.point)}  ${fmtOdds(tot?.under?.price)}`} />
        </Row>
      </View>

      <Picks predictions={g.predictions} />
    </View>
  );
}

function Row({ label, right, children }: React.PropsWithChildren<{ label: string; right?: string }>) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: "#666" }}>{right ?? ""}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>{children}</View>
    </View>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        padding: 8,
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 8,
      }}
    >
      <Text style={{ fontSize: 12, color: "#666" }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function Picks({
  predictions,
}: {
  predictions?: Game["predictions"];
}) {
  const pills: { label: string; value?: string }[] = [];

  if (predictions?.moneyline) {
    pills.push({
      label: "ML",
      value: `${predictions.moneyline.pick}  ${Math.round(predictions.moneyline.confidencePct)}%`,
    });
  }
  if (predictions?.spread) {
    pills.push({
      label: "Spread",
      value: `${predictions.spread.pick} ${predictions.spread.line}  ${Math.round(
        predictions.spread.confidencePct
      )}%`,
    });
  }
  if (predictions?.total) {
    pills.push({
      label: "Total",
      value: `${predictions.total.pick} ${Math.round(predictions.total.confidencePct)}%`,
    });
  }

  if (pills.length === 0) {
    return (
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Badge text="No model picks" tone="muted" />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {pills.map((p, i) => (
        <Badge key={i} text={`${p.label}: ${p.value}`} />
      ))}
    </View>
  );
}

function Badge({ text, tone = "active" }: { text: string; tone?: "active" | "muted" }) {
  const bg = tone === "muted" ? "#f2f2f2" : "#e8f7ef";
  const color = tone === "muted" ? "#666" : "#0a7";
  const border = tone === "muted" ? "#e5e5e5" : "#bfe9cf";
  return (
    <View style={{ backgroundColor: bg, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: border }}>
      <Text style={{ color, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}
