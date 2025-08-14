import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const job = await startJob('predictions_grade');
  try {
    const from = new Date(); from.setDate(from.getDate() - 2);

    const { data: finals, error: eR } = await supabaseAdmin
      .from('results')
      .select('game_id, home_score, away_score, final_at')
      .gte('final_at', from.toISOString());
    if (eR) throw eR;

    const gameIds = finals?.map(r => r.game_id) ?? [];
    if (gameIds.length === 0) {
      await finishJob(job.id, true, { graded: 0 });
      return NextResponse.json({ ok: true, graded: 0 });
    }

    const { data: preds, error: eP } = await supabaseAdmin
      .from('predictions')
      .select('id, game_id, pick_ml, pick_spread, pick_total, features')
      .in('game_id', gameIds);
    if (eP) throw eP;

    const byGame = new Map<number, any>();
    finals!.forEach(r => byGame.set(r.game_id, r));

    const grades = [];
    for (const p of preds ?? []) {
      const r = byGame.get(p.game_id);
      if (!r) continue;
      const diff = (r.home_score ?? 0) - (r.away_score ?? 0);

      const ml_correct = p.pick_ml === (diff > 0 ? 'HOME' : 'AWAY');

      let spread_correct: boolean | null = null;
      if (p.pick_spread) {
        const m = /^(HOME|AWAY)\s*([+-]?\d+(\.\d+)?)$/.exec(p.pick_spread);
        if (m) {
          const side = m[1];
          const line = Number(m[2]);
          const cover = side === 'HOME' ? (diff + line) > 0 : ((-diff) + line) > 0;
          spread_correct = cover;
        }
      }

      let total_correct: boolean | null = null;
      if (p.pick_total) {
        const total = (r.home_score ?? 0) + (r.away_score ?? 0);
        const line = Number(p.features?.odds?.total_points ?? NaN);
        if (!Number.isNaN(line)) {
          total_correct = p.pick_total === (total > line ? 'OVER' : 'UNDER');
        }
      }

      grades.push({
        prediction_id: p.id,
        game_id: p.game_id,
        ml_correct,
        spread_correct,
        total_correct
      });
    }

    for (let i = 0; i < grades.length; i += 200) {
      const chunk = grades.slice(i, i + 200);
      const { error } = await supabaseAdmin.from('prediction_grades').upsert(chunk, { onConflict: 'prediction_id' });
      if (error) throw error;
    }

    await finishJob(job.id, true, { graded: grades.length });
    return NextResponse.json({ ok: true, graded: grades.length });
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
