#!/usr/bin/env node
import fs from "fs";
import path from "path";

const roots = ["app", "components"];
const offenders = [];

// --- helper: walk files
function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) yield p;
  }
}

function info(msg) { console.log(`🔎 ${msg}`); }
function ok(msg)   { console.log(`✅ ${msg}`); }
function bad(msg)  { console.error(`❌ ${msg}`); }

// 1) disallow 'next/router' imports in app router files
info("Checking for 'next/router' imports in app/ & components/…");
for (const root of roots) {
  for (const file of walk(root)) {
    const txt = fs.readFileSync(file, "utf8");
    if (txt.includes("from 'next/router'") || txt.includes('from "next/router"')) {
      offenders.push(file);
    }
  }
}
if (offenders.length) {
  bad("Found 'next/router' imports in:");
  offenders.forEach(f => console.error(" -", f));
  process.exit(1);
}
ok("No 'next/router' imports found.");

// 2) App Router legitimately has many page.tsx/route.ts across folders.
//    Duplicate-basename check removed (not applicable).
info("Skipping duplicate-basename check (not applicable for App Router).");
ok("Web checks passed.");
