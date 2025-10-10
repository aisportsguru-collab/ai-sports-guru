import fs from "node:fs";

const file = "scripts/ingest/games.mjs";
if (!fs.existsSync(file)) {
  console.error("missing scripts/ingest/games.mjs");
  process.exit(1);
}
let s = fs.readFileSync(file, "utf8");

/* 1) import the guard at the very top (idempotent) */
if (!/^\s*import\s+['"]\.\/fetch-upsert-guard\.mjs['"]/.test(s)) {
  s = `import './fetch-upsert-guard.mjs';\n` + s;
}

/* 2) do not throw on 409 duplicate */
s = s.replace(/if\s*\(\s*!r\.ok\s*\)\s*\{/g, "if (!r.ok && r.status !== 409) {");

/* 3) write back */
fs.writeFileSync(file, s, "utf8");
console.log("patched:", file);
