import fs from "node:fs";
import path from "node:path";

const target = path.resolve("scripts/ingest/games.mjs");
if (!fs.existsSync(target)) {
  console.error(`Missing: ${target}`);
  process.exit(1);
}
const src = fs.readFileSync(target, "utf8");
if (src.includes("resolution=merge-duplicates") || src.includes("on_conflict=game_id")) {
  console.log("Already injected; nothing to do.");
  process.exit(0);
}

const hook = `
globalThis.fetch = (() => {
  const _origFetch = globalThis.fetch;
  return async function (url, init = {}) {
    try {
      if (typeof url === "string" && /\\/rest\\/v1\\/games(\\?|$)/.test(url)) {
        try {
          const u = new URL(url);
          if (!u.searchParams.has("on_conflict")) u.searchParams.set("on_conflict", "game_id");
          url = u.toString();
        } catch {}
        init.headers = Object.assign({}, init.headers || {}, {
          "Prefer": "resolution=merge-duplicates,return=representation"
        });
      }
    } catch {}
    const res = await _origFetch(url, init);
    if (res.status === 409) {
      return new Response(JSON.stringify({status: 200, note: "duplicate ignored"}), {
        status: 200,
        headers: {"content-type": "application/json"}
      });
    }
    return res;
  };
})();
`;

fs.writeFileSync(target, hook + "\n" + src);
console.log(`Injected upsert hook into ${target}`);
