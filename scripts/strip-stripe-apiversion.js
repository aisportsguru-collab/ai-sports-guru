const fs = require('fs');
const path = require('path');

function walk(dir, out=[]) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name.name)) out.push(p);
  }
  return out;
}

// Replace: new Stripe(SECRET, { apiVersion: "..." }) -> new Stripe(SECRET)
function stripApiVersionInFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('from \'stripe\'') && !src.includes('from "stripe"')) return false;

  const re = /new\s+Stripe\(\s*([^,()]+(?:\([^)]*\))?)\s*,\s*\{\s*apiVersion\s*:\s*['"][^'"]+['"]\s*\}\s*\)/g;
  const out = src.replace(re, (_m, key) => `new Stripe(${key})`);
  if (out !== src) {
    fs.writeFileSync(file, out);
    console.log('Stripped apiVersion ->', file);
    return true;
  }
  return false;
}

const root = process.cwd();
const files = walk(path.join(root, 'app'));
let changed = 0;
for (const f of files) {
  try {
    if (stripApiVersionInFile(f)) changed++;
  } catch (e) {
    // ignore non-readable files
  }
}
console.log(`Done. Files changed: ${changed}`);
