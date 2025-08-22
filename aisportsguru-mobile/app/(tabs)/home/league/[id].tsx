import { useLocalSearchParams } from "expo-router";
import React from "react";
import LeagueTemplate from "../../../src/screens/league/LeagueTemplate";

export default function LeagueById() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const key = String(id ?? "").toLowerCase();
  const titleMap: Record<string, string> = {
    nfl: "NFL", nba: "NBA", mlb: "MLB", nhl: "NHL", ncaaf: "NCAA Football", ncaab: "NCAA Basketball", wnba: "WNBA",
  };
  return <LeagueTemplate league={key || "nfl"} title={titleMap[key] ?? key.toUpperCase()} />;
}
