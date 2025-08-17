import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveOdds } from '@/lib/odds';
import { predict } from '@/lib/predict';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const league = (u.searchParams.get('league') || 'nfl').toLowerCase() as any;
    const day = (u.searchParams.get('date') || new Date().toISOString().slice(0,10));
    const games = await fetchLiveOdds(league, day);
    const picks = await predict(games);
    // Only return picks for games we know about today
    const byKey = new Set(games.map(g => `${g.homeTeam}|${g.awayTeam}|${g.kickoffISO.slice(0,16)}`));
    const filtered = picks.filter(p => byKey.has(`${p.homeTeam}|${p.awayTeam}|${p.kickoffISO.slice(0,16)}`));
    return NextResponse.json(filtered, { status: 200 });
  } catch (e:any) {
    return NextResponse.json([], { status: 200 });
  }
}
