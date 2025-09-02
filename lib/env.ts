export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing ${name} at runtime.`);
  }
  return v.trim();
}
export function readEnv(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  if (v && v.trim()) return v.trim();
  return fallback;
}
