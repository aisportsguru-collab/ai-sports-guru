import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const DAYS_AHEAD = 3;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const job = await startJob('odds_pull');
  try {
    const sports = ['nfl','nba','mlb','nhl','ncaaf','ncaab','wnba'];
    const until = new Date();
    until.setDate(until.getDate() + DAYS_AHEAD);

    for (const sport of sports) {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?regions=us&markets=h2h,spreads,totals&dateFormat=iso&apiKey=${process.env.THEODDS_API_KEY}`;
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`TheOddsAPI ${sport} ${resp.status}`);
      const games = await resp.json();

      for (const g of games) {
        const commence = new Date(g.commence_time);
        if (commence > until) continue;

        const { data: upG, error: eG } = await supabaseAdmin
          .from('games')
          .upsert({
            provider_game_id: g.id,
            sport,
            home_team: g.home_team,
            away_team: g.away_team,
            commence_time: g.commence_time,
            status: g.completed ? 'final' : 'scheduled'
          }, { onConflict: 'provider_game_id' })
          .select('id')
          .single();
        if (eG) throw eG;

        const b = Array.isArray(g.bookmakers) && g.bookmakers.length ? g.bookmakers[0] : null;

        let moneyline_home: number|undefined;
        let moneyline_away: number|undefined;
        let spread_line: number|undefined;
        let spread_home: number|undefined;
        let spread_away: number|undefined;
        let total_points: number|undefined;
        let over_odds: number|undefined;
        let under_odds: number|undefined;

        if (b) {
          const h2h = b.markets?.find((m: any) => m.key === 'h2h');
          const sp  = b.markets?.find((m: any) => m.key === 'spreads');
          const tot = b.markets?.find((m: any) => m.key === 'totals');

          if (h2h?.outcomes) {
            for (const o of h2h.outcomes) {
              if (o.name === g.home_team) moneyline_home = o.price;
              if (o.name === g.away_team) moneyline_away = o.price;
            }
          }
          if (sp?.outcomes) {
            for (const o of sp.outcomes) {
              if (o.name === g.home_team) { spread_home = o.price; spread_line ??= o.point; }
              if (o.name === g.away_team) { spread_away = o.price; spread_line ??= o.point; }
            }
          }
          if (tot?.outcomes) {
            for (const o of tot.outcomes) {
              if (/over/i.test(o.name)) { over_odds = o.price; total_points ??= o.point; }
              if (/under/i.test(o.name)) { under_odds = o.price; total_points ??= o.point; }
            }
          }
        }

        const { error: eO } = await supabaseAdmin.from('odds').insert({
          game_id: upG.id,
          moneyline_home, moneyline_away,
          spread_line, spread_home, spread_away,
          total_points, over_odds, under_odds,
          source: 'theoddsapi'
        });
        if (eO) throw eO;
      }
    }

    await finishJob(job.id, true, { pulled: true });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    await finishJob(job.id, false, { error: String(e?.message || e) });
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

async function startJob(name: string) {
  const { data } = await supabaseAdmin.from('job_runs').insert({ job_name: name }).select('id').single();
  return data!;
}
async function finishJob(id: number, ok: boolean, details: any) {
  await supabaseAdmin.from('job_runs').update({ success: ok, finished_at: new Date().toISOString(), details }).eq('id', id);
}
