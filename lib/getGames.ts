import { Game } from '../components/GameCard';

/**
 * Fetches odds and prediction data for a given sport.
 *
 * This function currently returns mocked data for demonstration purposes. In
 * production, replace the implementation with real network requests to
 * TheOddsAPI and your prediction model endpoint.
 *
 * @param sport One of "nba", "nfl", "mlb", "nhl", "ncaaf", "ncaab", "wnba".
 */
export async function getGames(): Promise<Game[]> {
  // TODO: Replace this mocked data with a call to your backend API endpoint
  // that aggregates sportsbook odds and prediction model outputs. An example
  // implementation might look like:
  // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sports/${sport}`);
  // const data = await response.json();
  // return data.games;

  // For now, return sample games to illustrate the UI. Each game includes
  // minimal information required by the GameCard component.
  return [
    {
      id: '1',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      commenceTime: new Date().toISOString(),
      odds: {
        moneylineHome: -150,
        moneylineAway: +130,
        spreadHome: -3.5,
        spreadAway: +3.5,
        totalPoints: 215.5
      },
      predictions: {
        moneylineWinner: 'home',
        moneylineConfidence: 68,
        spreadPick: 'away',
        spreadValue: 3.5,
        spreadConfidence: 54,
        totalPick: 'over',
        totalConfidence: 59
      }
    },
    {
      id: '2',
      homeTeam: 'Team C',
      awayTeam: 'Team D',
      commenceTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      odds: {
        moneylineHome: +120,
        moneylineAway: -140,
        spreadHome: +2.0,
        spreadAway: -2.0,
        totalPoints: 210.0
      },
      predictions: {
        moneylineWinner: 'away',
        moneylineConfidence: 72,
        spreadPick: 'away',
        spreadValue: -2.0,
        spreadConfidence: 60,
        totalPick: 'under',
        totalConfidence: 57
      }
    }
  ];
}