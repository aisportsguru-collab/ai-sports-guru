const fs = require('fs');
const path = require('path');

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (d.isFile() && d.name === 'route.ts') out.push(p);
  }
  return out;
}

function ensureRuntime(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (!/from ['"]stripe['"]/.test(s)) return false;
  if (/export\s+const\s+runtime\s*=/.test(s)) return false;
  s = `export const runtime = 'nodejs';\n\n` + s;
  fs.writeFileSync(file, s);
  console.log('Added runtime=nodejs ->', file);
  return true;
}

const routes = walk(path.join(process.cwd(), 'app', 'api'));
let changed = 0;
for (const r of routes) {
  try { if (ensureRuntime(r)) changed++; } catch {}
}
console.log(`Done. Routes updated: ${changed}`);
