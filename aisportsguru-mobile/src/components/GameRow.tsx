import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";

type NullableNum = number | null | undefined;
type TeamOdds = { point?: NullableNum; line?: NullableNum; price?: NullableNum };
type MoneylineOdds = { away?: NullableNum; home?: NullableNum };
type SpreadOdds = { away?: TeamOdds; home?: TeamOdds };
type TotalOdds = { over?: TeamOdds; under?: TeamOdds };

type Odds = {
  moneyline?: MoneylineOdds;
  spread?: SpreadOdds;
  total?: TotalOdds;
  book?: string | null;
};

type PickKind = "HOME" | "AWAY" | "Over" | "Under" | string | undefined;

type PredSide = {
  pick?: PickKind;
  confidencePct?: NullableNum;  // 0–100
  confidence?: NullableNum;     // 0–1
  probability?: NullableNum;    // 0–1
};

type Predictions = {
  moneyline?: PredSide;
  spread?: PredSide;
  total?: PredSide;
};

type Game = {
  id?: string | number;
  league?: string;
  away?: string;
  home?: string;
  kickoffISO?: string | null;
  odds?: Odds;
  predictions?: Predictions;
};

type Props = { game: Game };

const isNum = (v: any): v is number => typeof v === "number" && Number.isFinite(v);
const strip = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1))));

const fmtPrice = (v: NullableNum) => (isNum(v) ? (v > 0 ? `+${v}` : `${v}`) : "—");
const fmtPriceParen = (v: NullableNum) => (isNum(v) ? ` (${v > 0 ? "+" + v : v})` : "");
const fmtSignedPoint = (v: NullableNum) => (isNum(v) ? (v > 0 ? `+${strip(v)}` : `${strip(v)}`) : "—");
const fmtTotalPoint = (v: NullableNum) => (isNum(v) ? `${strip(v)}` : "—");

const priceOf = (o?: TeamOdds) =>
  isNum(o?.line) ? o!.line! : isNum(o?.price) ? o!.price! : undefined;
const pointOf = (o?: TeamOdds) => (isNum(o?.point) ? o!.point! : undefined);

const clampConf = (pred?: PredSide) => {
  const pct = isNum(pred?.confidencePct)
    ? pred!.confidencePct!
    : isNum(pred?.confidence)
    ? pred!.confidence! * 100
    : isNum(pred?.probability)
    ? pred!.probability! * 100
    : undefined;
  if (!isNum(pct)) return undefined;
  const rounded = Math.round(pct);
  return Math.max(51, Math.min(100, rounded));
};

const pickName = (pick: PickKind, away?: string, home?: string) => {
  if (pick === "AWAY") return away ?? "Away";
  if (pick === "HOME") return home ?? "Home";
  if (typeof pick === "string") return pick; // "Over"/"Under"
  return "";
};

function Row({
  label,
  left,
  center,
  right,
}: {
  label: string;
  left: string;
  center?: string;
  right: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={styles.cellLeft} numberOfLines={1}>{left}</Text>
      {center !== undefined && <Text style={styles.cellCenter} numberOfLines={1}>{center}</Text>}
      <Text style={styles.cellRight} numberOfLines={1}>{right}</Text>
    </View>
  );
}

const Chip = ({ text }: { text: string }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{text}</Text>
  </View>
);

function GameRowBase({ game: g }: Props) {
  const away = g.away ?? "Away";
  const home = g.home ?? "Home";

  // MONEYLINE
  const mlAway = isNum(g.odds?.moneyline?.away) ? g.odds!.moneyline!.away! : undefined;
  const mlHome = isNum(g.odds?.moneyline?.home) ? g.odds!.moneyline!.home! : undefined;

  // SPREAD (derive both points; mirror sign if only one is present)
  const spAway = g.odds?.spread?.away;
  const spHome = g.odds?.spread?.home;
  const spAwayPoint = pointOf(spAway) ?? (isNum(pointOf(spHome)) ? -pointOf(spHome)! : undefined);
  const spHomePoint = pointOf(spHome) ?? (isNum(pointOf(spAway)) ? -pointOf(spAway)! : undefined);
  const spAwayPrice = priceOf(spAway);
  const spHomePrice = priceOf(spHome);

  // TOTAL
  const toOver = g.odds?.total?.over;
  const toUnder = g.odds?.total?.under;
  const toOverPrice = priceOf(toOver);
  const toUnderPrice = priceOf(toUnder);
  const toPoint = pointOf(toOver) ?? pointOf(toUnder);

  // Predictions
  const pML = g.predictions?.moneyline;
  const pSP = g.predictions?.spread;
  const pTO = g.predictions?.total;

  const mlPickTeam = pickName(pML?.pick, away, home);
  const mlConf = clampConf(pML);

  const spPickTeam = pickName(pSP?.pick, away, home);
  const spConf = clampConf(pSP);

  const toPick = pickName(pTO?.pick, away, home); // "Over"/"Under"
  const toConf = clampConf(pTO);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTeam} numberOfLines={1} ellipsizeMode="tail">{away}</Text>
        <Text style={styles.headerMid}>Odds</Text>
        <Text style={[styles.headerTeam, styles.headerTeamRight]} numberOfLines={1} ellipsizeMode="tail">{home}</Text>
      </View>

      {/* Odds – compact */}
      <View style={styles.table}>
        <Row
          label="Moneyline"
          left={fmtPrice(mlAway)}
          center={""}
          right={fmtPrice(mlHome)}
        />
        <Row
          label="Spread"
          left={`${fmtSignedPoint(spAwayPoint)}${fmtPriceParen(spAwayPrice)}`}
          center={""}
          right={`${fmtSignedPoint(spHomePoint)}${fmtPriceParen(spHomePrice)}`}
        />
        <Row
          label="Total"
          left={`Over ${fmtPrice(toOverPrice)}`}
          center={fmtTotalPoint(toPoint)}
          right={`Under ${fmtPrice(toUnderPrice)}`}
        />
      </View>

      {/* Predictions */}
      <View style={styles.pills}>
        {mlPickTeam && isNum(mlConf) && (
          <Chip text={`ML: ${mlPickTeam} ${mlConf}%`} />
        )}
        {spPickTeam && isNum(spAwayPoint ?? spHomePoint) && isNum(spConf) && (
          <Chip text={`Spread: ${spPickTeam} ${fmtSignedPoint(spPickTeam === away ? spAwayPoint : spHomePoint)} ${spConf}%`} />
        )}
        {toPick && isNum(toPoint) && isNum(toConf) && (
          <Chip text={`Total: ${toPick} ${fmtTotalPoint(toPoint)} ${toConf}%`} />
        )}
      </View>
    </View>
  );
}

export default memo(GameRowBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0b1420",
    borderColor: "#132033",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTeam: {
    flex: 1,
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTeamRight: { textAlign: "right" },
  headerMid: {
    width: 56,
    textAlign: "center",
    color: "#a6b3c8",
    fontSize: 12,
    fontWeight: "700",
  },
  table: { marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  label: {
    width: 72,
    color: "#7e8aa3",
    fontSize: 12,
  },
  cellLeft: {
    flex: 1.15,
    color: "white",
    textAlign: "left",
    fontVariant: ["tabular-nums"],
  },
  cellCenter: {
    width: 56,
    color: "white",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  cellRight: {
    flex: 1.15,
    color: "white",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: "#10b981",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  chipText: {
    color: "#062e26",
    fontWeight: "700",
    fontSize: 12,
  },
});
