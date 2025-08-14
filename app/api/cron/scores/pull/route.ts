import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const DAYS_BACK = 2;
const KEY_MAP: Record<string,string> = {
  nfl:  'americanfootball_nfl',
  nba:  'basketball_nba',
  mlb:  'baseball_mlb',
  nhl:  'icehockey_nhl',
  ncaaf:'americanfootball_ncaaf',
  ncaab:'basketball_ncaab',
  wnba: 'basketball_wnba',
};

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.THEODDS_API_KEY || process.env.THE_ODDS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'missing THEODDS_API_KEY' }, { status: 500 });

  const job = await startJob('scores_pull');
  try {
    let updates = 0;
    for (const sport of Object.keys(KEY_MAP)) {
      const oddsKey = KEY_MAP[sport];
      const url = `https://api.the-odds-api.com/v4/sports/${oddsKey}/scores?daysFrom=${DAYS_BACK}&dateFormat=iso&apiKey=${apiKey}`;
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`TheOddsAPI scores ${sport} ${resp.status} ${await safeText(resp)}`);
      const games = await resp.json();

      for (const g of games) {
        const commence = g.commence_time ? new Date(g.commence_time) : null;
        const season = commence ? String(commence.getUTCFullYear()) : null;
        const game_date = commence ? commence.toISOString().split('T')[0] : null;

        const { data: upG, error: eG } = await supabaseAdmin
          .from('games')
          .upsert({
            provider_game_id: g.id,
            sport,
            home_team: g.home_team ?? g.teams?.[1] ?? null,
            away_team: g.away_team ?? g.teams?.[0] ?? null,
            commence_time: g.commence_time ?? null,
            status: g.completed ? 'final' : (g.in_progress ? 'live' : 'scheduled'),
            season,
            game_date
          }, { onConflict: 'provider_game_id' })
          .select('id,home_team,away_team')
          .single();
        if (eG) throw eG;

        let homeScore: number | null = null;
        let awayScore: number | null = null;

        if (Array.isArray(g.scores)) {
          for (const s of g.scores) {
            const name = String(s.name ?? '').toLowerCase();
            const val = Number(s.score ?? s.points ?? NaN);
            if (!Number.isNaN(val)) {
              if (upG.home_team && name === String(upG.home_team).toLowerCase()) homeScore = val;
              if (upG.away_team && name === String(upG.away_team).toLowerCase()) awayScore = val;
            }
          }
        }
        if (homeScore === null && typeof g.home_score !== 'undefined') homeScore = Number(g.home_score);
        if (awayScore === null && typeof g.away_score !== 'undefined') awayScore = Number(g.away_score);

        if (homeScore !== null && awayScore !== null && g.completed) {
          const { error: eR } = await supabaseAdmin
            .from('results')
            .upsert({
              game_id: upG.id,
              home_score: homeScore,
              away_score: awayScore,
              final_at: new Date().toISOString()
            }, { onConflict: 'game_id' });
          if (eR) throw eR;
          updates++;
        }
      }
    }

    await finishJob(job.id, true, { updates });
    return NextResponse.json({ ok: true, updates });
  } catch (e: any) {
    await finishJob(job.id, false, { error: String(e?.message || e) });
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

async function safeText(r: Response) { try { return await r.text(); } catch { return ''; } }
async function startJob(name: string) {
  const { data } = await supabaseAdmin.from('job_runs').insert({ job_name: name }).select('id').single();
  return data!;
}
async function finishJob(id: number, ok: boolean, details: any) {
  await supabaseAdmin.from('job_runs').update({ success: ok, finished_at: new Date().toISOString(), details }).eq('id', id);
}
