import fs from "fs";

const file = "scripts/ingest/games.mjs";
if (!fs.existsSync(file)) {
  console.error("missing scripts/ingest/games.mjs");
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8");

// 1) Make the throw check ignore 409s (several common formatting variants)
const variants = [
  "if (!r.ok){",
  "if(!r.ok){",
  "if (!r.ok) {",
  "if(!r.ok) {",
];
let rewrites = 0;
for (const v of variants) {
  if (s.includes(v)) {
    s = s.split(v).join("if (!r.ok && r.status !== 409) {");
    rewrites++;
  }
}

// 2) Also fix any explicit 409 throws that look like: if (r.status === 409) throw ...
s = s.replace(/if\s*\(\s*r\.status\s*===?\s*409\s*\)\s*throw[^{;]+[;}]?/g, "/* duplicate ignored */");

// 3) Save if we changed anything
if (rewrites === 0 && !/duplicate ignored/.test(s)) {
  console.log("No throw sites found; nothing to change.");
} else {
  fs.writeFileSync(file, s, "utf8");
  console.log(`Patched ${file}: rewrote ${rewrites} throw-site(s) to ignore 409.`);
}
