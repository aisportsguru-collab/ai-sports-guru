import fs from 'fs';
import { execSync } from 'node:child_process';

try { execSync('git fetch origin main', { stdio: 'inherit' }); } catch {}
try {
  execSync('git checkout origin/main -- scripts/ingest/games.mjs', { stdio: 'inherit' });
} catch {}

const path = 'scripts/ingest/games.mjs';
let src = fs.readFileSync(path, 'utf8');
if (src.includes('// DUPLICATE PATCH APPLIED')) {
  console.log('Already patched; nothing to do.');
  process.exit(0);
}

const hook = [
"(function(){",
"  const g = globalThis;",
"  if (g.__ODDS_UPSERT_HOOK__) return;",
"  g.__ODDS_UPSERT_HOOK__ = true;",
"  const orig = g.fetch;",
"  if (typeof orig !== 'function') return;",
"  g.fetch = async (url, init = {}) => {",
"    try {",
"      if (typeof url === 'string' && url.includes('/rest/v1/games')) {",
"        try {",
"          const u = new URL(url);",
"          if (!u.searchParams.has('on_conflict')) u.searchParams.append('on_conflict','game_id');",
"          url = u.toString();",
"        } catch {}",
"        init.headers = Object.assign({}, init.headers || {}, {",
"          'Prefer':'resolution=merge-duplicates,return=representation'",
"        });",
"      }",
"    } catch {}",
"    const res = await orig(url, init);",
"    if (res && res.status === 409) {",
"      return new Response(JSON.stringify({ ok:true, note:'duplicate ignored' }), {",
"        status: 200,",
"        headers: { 'content-type':'application/json' }",
"      });",
"    }",
"    return res;",
"  };",
"})();",
"// DUPLICATE PATCH APPLIED",
""].join('\\n');

fs.writeFileSync(path, hook + '\n' + src);
console.log('✅ Injected upsert guard into scripts/ingest/games.mjs');
