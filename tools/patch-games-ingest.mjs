import fs from 'node:fs';

const file = 'scripts/ingest/games.mjs';
if (!fs.existsSync(file)) {
  console.error(`Missing ${file}`);
  process.exit(1);
}
let s = fs.readFileSync(file, 'utf8');

if (!s.includes("fetch-upsert-guard.mjs")) {
  s = `import './fetch-upsert-guard.mjs';\n` + s;
}

s = s.replace(/(^|[^A-Za-z0-9_])fetch\(/g, (_m, p1) => `${p1}globalThis.fetch(`);

s = s.replace(/if\s*\(\s*!+\s*r\.ok\s*\)\s*\{/g, 'if (!r.ok && r.status !== 409) {');

s = s.replace(/(\/rest\/v1\/games)(?![^\n"'`]*on_conflict)/g, '$1?on_conflict=game_id');
s = s.replace(/(\/rest\/v1\/games[^\n"'`]*\?[^"'`]*)(?<!on_conflict=game_id)(['"`])/g, (_m, pre, q) => {
  const sep = pre.includes('?') ? '&' : '?';
  return `${pre}${sep}on_conflict=game_id${q}`;
});

fs.writeFileSync(file, s);
console.log(`Patched ${file}`);
