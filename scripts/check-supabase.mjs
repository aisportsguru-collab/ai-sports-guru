import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const service = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function mask(s, keep=6){ if(!s) return null; return s.length<=keep*2 ? s : s.slice(0,keep)+'...'+s.slice(-keep); }

console.log('URL:', url);
console.log('ANON:', mask(anon));
console.log('SERVICE:', mask(service));

const anonClient = createClient(url, anon || '');
const adminClient = createClient(url, (service || anon || ''));

async function run() {
  const a = await anonClient.from('games').select('id').limit(1);
  console.log('anon select games ->', { ok: !a.error, error: a.error?.message, rows: a.data?.length ?? 0 });

  const b = await adminClient.from('games').select('id').limit(1);
  console.log('admin select games ->', { ok: !b.error, error: b.error?.message, rows: b.data?.length ?? 0 });

  const c = await adminClient.from('v_predictions_ui').select('game_id').limit(1);
  console.log('admin select v_predictions_ui ->', { ok: !c.error, error: c.error?.message, rows: c.data?.length ?? 0 });
}

run().catch(e => { console.error('fatal:', e); process.exit(1); });
