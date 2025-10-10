import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 60;

const SPORT_KEY: Record<string, string> = {
  nfl: 'americanfootball_nfl',
  ncaaf: 'americanfootball_ncaaf',
  nba: 'basketball_nba',
  ncaab: 'basketball_ncaab',
  nhl: 'icehockey_nhl',
  mlb: 'baseball_mlb',
  wnba: 'basketball_wnba',
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ league: string }> }
) {
  const { league } = await context.params;
  const leagueSlug = (league ?? '').toLowerCase();
  const sportKey = SPORT_KEY[leagueSlug];

  const now = new Date();
  const dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return NextResponse.json({
    league: leagueSlug,
    sport_key: sportKey ?? '',
    from: dateFrom.toISOString(),
    to: dateTo.toISOString(),
    count: 0,
    games: [],
    _meta: {
      gamesPath: null,
      predsPath: null,
      totalSourceGames: 0,
    },
  });
}
