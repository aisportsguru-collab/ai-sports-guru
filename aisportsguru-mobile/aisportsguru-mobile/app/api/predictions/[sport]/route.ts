import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(req: NextRequest, { params }: { params: { sport: string } }) {
  const url = new URL(req.url);
  const daysFrom = Number(url.searchParams.get('daysFrom') ?? '0');

  const from = new Date();
  from.setDate(from.getDate() + daysFrom);
  from.setHours(0,0,0,0);
  const to = new Date(from);
  to.setHours(23,59,59,999);

  const { data, error } = await supabaseAdmin
    .from('v_predictions_api')
    .select('*')
    .eq('sport', (params.sport ?? '').toLowerCase())
    .gte('commence_time', from.toISOString())
    .lte('commence_time', to.toISOString())
    .order('commence_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const res = NextResponse.json(data ?? []);
  res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res;
}
