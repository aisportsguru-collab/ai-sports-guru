import { useLocalSearchParams } from "expo-router";
import React from "react";

// Screens (already created)
import NFL  from "../../../src/screens/league/NFL";
import NBA  from "../../../src/screens/league/NBA";
import MLB  from "../../../src/screens/league/MLB";
import NHL  from "../../../src/screens/league/NHL";
import NCAAF from "../../../src/screens/league/NCAAF";

export default function LeagueById() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const key = String(id ?? "").toLowerCase();

  switch (key) {
    case "nba":
      return <NBA />;
    case "mlb":
      return <MLB />;
    case "nhl":
      return <NHL />;
    case "ncaaf":
      return <NCAAF />;
    case "nfl":
    default:
      return <NFL />;
  }
}
