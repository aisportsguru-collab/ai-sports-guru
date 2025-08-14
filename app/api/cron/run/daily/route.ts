import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const job = await startJob('predictions_run');
  try {
    const from = new Date();
    const to = new Date(); to.setDate(to.getDate() + 3);

    const { data: games, error: e1 } = await supabaseAdmin
      .from('games')
      .select('id, sport, home_team, away_team, commence_time')
      .gte('commence_time', from.toISOString())
      .lte('commence_time', to.toISOString());
    if (e1) throw e1;

    const ids = (games ?? []).map(g => g.id);
    const { data: odds } = await supabaseAdmin
      .from('v_latest_odds')
      .select('*')
      .in('game_id', ids);

    const byGame: Record<number, any> = {};
    for (const o of odds ?? []) byGame[o.game_id] = o;

    const rows = [];
    for (const g of games ?? []) {
      const o = byGame[g.id] || {};
      const pick_ml = (o.moneyline_home ?? 0) <= (o.moneyline_away ?? 0) ? 'HOME' : 'AWAY';
      const conf_ml = 60;

      const pick_spread = o.spread_line != null ? (o.spread_line <= 0 ? 'HOME ' + o.spread_line : 'AWAY +' + o.spread_line) : null;
      const conf_spread = 55;

      const pick_total = o.total_points != null ? 'UNDER' : null;
      const conf_total = 53;

      rows.push({
        game_id: g.id,
        model_version: 'v1',
        pick_ml, conf_ml,
        pick_spread, conf_spread,
        pick_total, conf_total,
        features: { odds: o, meta: { ts: new Date().toISOString() } }
      });
    }

    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabaseAdmin.from('predictions').upsert(chunk, { onConflict: 'game_id,model_version' });
      if (error) throw error;
    }

    await finishJob(job.id, true, { predicted: rows.length });
    return NextResponse.json({ ok: true, predicted: rows.length });
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
