/**
 * Centralized environment loader for backend scripts.
 * - Loads from backend/.env.local, .env.local, or .env (first found)
 * - Validates required keys and prints a clear message if any are missing
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const CANDIDATES = [
  path.resolve("backend/.env.local"),
  path.resolve(".env.local"),
  path.resolve(".env"),
];

let used = null;
for (const p of CANDIDATES) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    used = p;
    break;
  }
}
// If none exist, we still continue — caller may rely on real environment.
if (used) {
  console.log(`[env] loaded: ${used}`);
} else {
  console.warn("[env] no .env file found, relying on process environment");
}

/** Validate presence of keys; throw with a helpful message if missing */
export function requireEnv(keys = []) {
  const missing = keys.filter((k) => !process.env[k] || process.env[k].trim() === "");
  if (missing.length) {
    throw new Error(
      `Missing required env key(s): ${missing.join(", ")}. ` +
      `Add them to backend/.env.local (preferred) or .env.local / .env.`
    );
  }
}

export default { requireEnv };
