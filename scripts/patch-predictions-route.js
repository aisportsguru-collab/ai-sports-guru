const fs = require('fs');
const path = 'app/api/predictions/[sport]/route.ts';

if (!fs.existsSync(path)) {
  console.error('route file not found at', path);
  process.exit(1);
}

let s = fs.readFileSync(path, 'utf8');

// ensure runtime is nodejs at the very top
if (!/export\s+const\s+runtime\s*=\s*'nodejs'/.test(s)) {
  s = "export const runtime = 'nodejs';\n\n" + s;
}

// relax the second argument type on GET to any
// covers common patterns where context has params.sport typed
s = s.replace(
  /(export\s+async\s+function\s+GET\s*\(\s*[^,]+,\s*)(\{\s*params\s*:\s*\{\s*sport\s*:\s*string\s*\}\s*\}\s*)(\))/m,
  (_m, a, _b, c) => a + 'any' + c
);

// also handle NextRequest signature style
s = s.replace(
  /(export\s+async\s+function\s+GET\s*\(\s*[A-Za-z0-9_]+\s*:\s*[A-Za-z0-9_<>]+,\s*)(\{\s*params\s*:\s*\{\s*sport\s*:\s*string\s*\}\s*\}\s*)(\))/m,
  (_m, a, _b, c) => a + 'any' + c
);

fs.writeFileSync(path, s);
console.log('Patched', path);
