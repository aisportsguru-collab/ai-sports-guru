import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY;
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso&daysFrom=1&apiKey=${apiKey}`
    );

    if (!response.ok) {
      console.error("Failed to fetch from TheOddsAPI:", response.statusText);
      return NextResponse.json([]);
    }

    const games = await response.json();

    if (!games || games.length === 0) {
      return NextResponse.json([]);
    }

    const formattedGames = games.map((game: any, idx: number) => {
      const h2h = game.bookmakers[0]?.markets.find((m: any) => m.key === "h2h")?.outcomes;
      const spreads = game.bookmakers[0]?.markets.find((m: any) => m.key === "spreads")?.outcomes;
      const totals = game.bookmakers[0]?.markets.find((m: any) => m.key === "totals")?.outcomes;

      return {
        id: `${idx}-${game.id}`,
        home_team: game.home_team,
        away_team: game.away_team,
        commence_time: game.commence_time,
        moneyline: {
          home: h2h?.find((o: any) => o.name === game.home_team)?.price ?? 0,
          away: h2h?.find((o: any) => o.name === game.away_team)?.price ?? 0
        },
        spread: {
          point: spreads?.[0]?.point ?? 0,
          home: spreads?.find((o: any) => o.name === game.home_team)?.price ?? 0,
          away: spreads?.find((o: any) => o.name === game.away_team)?.price ?? 0
        },
        total: {
          point: totals?.[0]?.point ?? 0,
          over: totals?.find((o: any) => o.name === "Over")?.price ?? 0,
          under: totals?.find((o: any) => o.name === "Under")?.price ?? 0
        },
        prediction: {
          moneyline: {
            pick: "TBD",
            confidence: 0
          },
          spread: {
            pick: "TBD",
            confidence: 0
          },
          total: {
            pick: "TBD",
            confidence: 0
          }
        }
      };
    });

    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error("NBA API route error:", error);
    return NextResponse.json([]);
  }
}
