import fs from 'node:fs';

const path = 'scripts/ingest/games.mjs';
if (!fs.existsSync(path)) { console.error('missing', path); process.exit(1); }
let s = fs.readFileSync(path,'utf8');

/* 1) Ensure the REST URL uses on_conflict=game_id */
s = s.replace(/(\/rest\/v1\/games)(?!\?)/g, '$1?on_conflict=game_id');
s = s.replace(/(\/rest\/v1\/games\?)(?![^"'`\n]*\bon_conflict=game_id)/g, '$1on_conflict=game_id&');

/* 2) Ensure the Prefer header includes resolution=merge-duplicates */
s = s.replace(/(Prefer\s*:\s*['"])([^'"]*)(['"])/g, (_m, a, val, z) => {
  const parts = new Set(val.split(/\s*,\s*/).filter(Boolean));
  parts.add('resolution=merge-duplicates');
  // keep return preference if it was present; nothing else dropped
  return a + Array.from(parts).join(',') + z;
});

/* 3) Don't throw on 409 */
s = s.replace(/if\s*\(\s*!r\.ok\s*\)\s*\{/g, 'if (!r.ok && r.status !== 409) {');

/* 4) Make sure our guard can hook (prefer global fetch; drop node-fetch import if present) */
s = s.replace(/^\s*import\s+fetch\s+from\s+["']node-fetch["'];?\s*\n/m, '');
s = s.replace(/(^|[^A-Za-z0-9_])fetch\(/g, (_m, pre) => pre + 'globalThis.fetch(');

fs.writeFileSync(path, s);
console.log('patched', path);
