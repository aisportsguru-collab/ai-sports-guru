import fs from "node:fs";

const file = "scripts/ingest/games.mjs";
if (!fs.existsSync(file)) {
  console.error(`Missing ${file}`);
  process.exit(1);
}

let src = fs.readFileSync(file, "utf8");

// 1) Prepend a tiny fetch guard (idempotent)
if (!src.includes("__ODDS_UPSERT_GUARD__")) {
  const guard = `
(() => {
  const g = globalThis;
  if (g.__ODDS_UPSERT_GUARD__) return;
  g.__ODDS_UPSERT_GUARD__ = true;
  const _orig = g.fetch;
  if (typeof _orig !== "function") return;

  g.fetch = async (url, init = {}) => {
    // For inserts to /rest/v1/games, force upsert semantics
    try {
      if (typeof url === "string" && url.includes("/rest/v1/games")) {
        try {
          const u = new URL(url);
          if (!u.searchParams.has("on_conflict")) u.searchParams.append("on_conflict", "game_id");
          url = u.toString();
        } catch {}
        init.headers = Object.assign({}, init.headers || {}, {
          Prefer: "resolution=merge-duplicates,return=representation"
        });
      }
    } catch {}
    const res = await _orig(url, init);
    // If Supabase still returns a 409, treat as success
    if (typeof url === "string" && url.includes("/rest/v1/games") && res.status === 409) {
      return new Response(JSON.stringify({ note: "duplicate ignored" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
    return res;
  };
})();
`.trim() + "\n";
  src = guard + src;
}

// 2) Ensure calls use the global fetch (so our guard wraps them)
src = src.replace(/(?<![A-Za-z0-9_])fetch\(/g, "globalThis.fetch(");

// 3) Ensure the Supabase endpoint includes on_conflict=game_id (belt-and-suspenders)
src = src.replace(/(\/rest\/v1\/games)(?!\?)/g, "$1?on_conflict=game_id");

// 4) Do not throw on 409 anywhere that still checks r.ok
src = src.replace(/if\s*\(\s*!?\s*r\.ok\s*\)\s*\{\s*throw/g, "if (!r.ok && r.status !== 409) { throw");

fs.writeFileSync(file, src, "utf8");
console.log("✅ Patched scripts/ingest/games.mjs for duplicate-safe upserts.");
