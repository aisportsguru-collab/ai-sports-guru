import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('job_runs')
    .select('id,job_name,started_at,finished_at,success,details')
    .order('started_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}
